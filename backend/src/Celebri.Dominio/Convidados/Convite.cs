using Celebri.Dominio.DadosSensiveis;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Convidados;

public class Convite : IPertenceCasamento
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;
    public const int TamanhoMaximoGrupo = 60;
    public const int LimiteAcompanhantesMinimo = 0;
    public const int LimiteAcompanhantesMaximo = 10;
    public const int ConvidadosMinimo = 1;
    public const int ConvidadosMaximo = 30;
    public const int ConvidadosMaximoPorCasamento = 5000;

    private readonly List<Convidado> _convidados = [];

    private Convite()
    {
        Nome = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public string Nome { get; private set; }

    public string? Grupo { get; private set; }

    public int LimiteAcompanhantes { get; private set; }

    public StatusEnvioConvite StatusEnvio { get; private set; }

    public DateTimeOffset? RespondidoEm { get; private set; }

    public DateTimeOffset? UltimaCobrancaEm { get; private set; }

    public int QuantidadeCobrancas { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public IReadOnlyList<Convidado> Convidados => _convidados;

    public static Convite Criar(Guid casamentoId, DadosConvite dados, DateTimeOffset agora)
    {
        if (casamentoId == Guid.Empty)
        {
            throw new ArgumentException("O casamento do convite é obrigatório.", nameof(casamentoId));
        }

        var convite = new Convite
        {
            Id = Guid.NewGuid(),
            CasamentoId = casamentoId,
            StatusEnvio = StatusEnvioConvite.NaoEnviado,
            CriadoEm = agora,
        };

        convite.Aplicar(dados, agora);
        return convite;
    }

    public void Atualizar(DadosConvite dados, DateTimeOffset agora)
    {
        Aplicar(dados, agora);
    }

    public IReadOnlyList<Convidado> ConvidadosOrdenados()
    {
        return _convidados.OrderBy(convidado => convidado.Ordem).ThenBy(convidado => convidado.CriadoEm).ToList();
    }

    public int QuantidadeAcompanhantes()
    {
        return _convidados.Count(convidado => convidado.Acompanhante);
    }

    public bool MarcarEnviado(DateTimeOffset agora)
    {
        if (StatusEnvio != StatusEnvioConvite.NaoEnviado)
        {
            return false;
        }

        StatusEnvio = StatusEnvioConvite.Enviado;
        AtualizadoEm = agora;
        return true;
    }

    public bool PodeSerCobrado()
    {
        return StatusEnvio != StatusEnvioConvite.NaoEnviado
            && _convidados.Exists(convidado => convidado.Resposta == RespostaRsvp.Pendente);
    }

    public void RegistrarCobranca(DateTimeOffset agora)
    {
        if (!PodeSerCobrado())
        {
            throw new RegraNegocioException(MensagensConvidados.ConviteNaoCobravel);
        }

        UltimaCobrancaEm = agora;
        QuantidadeCobrancas++;
        AtualizadoEm = agora;
    }

    public bool MarcarVisualizado(DateTimeOffset agora)
    {
        if (StatusEnvio == StatusEnvioConvite.Visualizado)
        {
            return false;
        }

        StatusEnvio = StatusEnvioConvite.Visualizado;
        AtualizadoEm = agora;
        return true;
    }

    public void RegistrarRespostaRsvp(
        IReadOnlyList<RespostaPessoaRsvp> respostas,
        IReadOnlyList<DadosAcompanhanteRsvp> acompanhantes,
        DateTimeOffset agora)
    {
        RegistrarRespostaRsvp(respostas, acompanhantes, null, SemCifragem, agora);
    }

    public void RegistrarRespostaRsvp(
        IReadOnlyList<RespostaPessoaRsvp> respostas,
        IReadOnlyList<DadosAcompanhanteRsvp> acompanhantes,
        ConsentimentoDadosSensiveis? consentimento,
        Func<RestricaoAlimentar, Guid, string> cifrar,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(respostas);
        ArgumentNullException.ThrowIfNull(acompanhantes);
        ArgumentNullException.ThrowIfNull(cifrar);

        var titulares = _convidados.Where(convidado => !convidado.Acompanhante).ToDictionary(convidado => convidado.Id);
        var acompanhantesAtuais = _convidados.Where(convidado => convidado.Acompanhante).ToDictionary(convidado => convidado.Id);

        ValidarRespostas(respostas, titulares);
        var normalizados = NormalizarAcompanhantes(acompanhantes, acompanhantesAtuais);

        var alguemVai = respostas.Any(resposta => resposta.Resposta == RespostaRsvp.Confirmado);

        if (!alguemVai && normalizados.Count > 0)
        {
            throw new RegraNegocioException(MensagensConvidados.AcompanhanteSemConfirmacao);
        }

        if (normalizados.Count > LimiteAcompanhantes)
        {
            throw new RegraNegocioException(MensagensConvidados.LimiteAcompanhantesExcedido);
        }

        if (titulares.Count + normalizados.Count > ConvidadosMaximo)
        {
            throw new RegraNegocioException(MensagensConvidados.QuantidadeConvidados);
        }

        var informaDadosSensiveis = respostas.Any(resposta =>
                resposta.Resposta == RespostaRsvp.Confirmado && Informa(resposta.DadosSensiveis))
            || normalizados.Exists(acompanhante => Informa(acompanhante.DadosSensiveis));

        if (informaDadosSensiveis && consentimento is null)
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.ConsentimentoObrigatorio);
        }

        foreach (var resposta in respostas)
        {
            var titular = titulares[resposta.ConvidadoId];
            titular.Responder(resposta.Resposta, agora);

            var alteracao = resposta.Resposta == RespostaRsvp.Recusado
                ? AlteracaoDadosSensiveis.Remover
                : resposta.DadosSensiveis ?? AlteracaoDadosSensiveis.Manter;
            titular.AlterarDadosSensiveis(alteracao, consentimento, cifrar, agora);
        }

        foreach (var (acompanhante, dados) in SincronizarAcompanhantes(normalizados, titulares.Values, agora))
        {
            acompanhante.AlterarDadosSensiveis(dados.DadosSensiveis ?? AlteracaoDadosSensiveis.Manter, consentimento, cifrar, agora);
        }

        RespondidoEm = agora;
        StatusEnvio = StatusEnvioConvite.Visualizado;
        AtualizadoEm = agora;
    }

    public void RegistrarDadosSensiveis(
        Guid convidadoId,
        AlteracaoDadosSensiveis alteracao,
        ConsentimentoDadosSensiveis? consentimento,
        Func<RestricaoAlimentar, Guid, string> cifrar,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(alteracao);
        ArgumentNullException.ThrowIfNull(cifrar);

        var convidado = _convidados.Find(pessoa => pessoa.Id == convidadoId)
            ?? throw new RegraNegocioException(MensagensConvidados.ConvidadoDeOutroConvite);

        convidado.AlterarDadosSensiveis(alteracao, consentimento, cifrar, agora);
        AtualizadoEm = agora;
    }

    private static bool Informa(AlteracaoDadosSensiveis? alteracao)
    {
        return alteracao?.Tipo == TipoAlteracaoDadosSensiveis.Informar;
    }

    private static string SemCifragem(RestricaoAlimentar restricao, Guid convidadoId)
    {
        throw new InvalidOperationException("Nenhuma cifragem foi fornecida para gravar dados sensíveis.");
    }

    private static void ValidarRespostas(IReadOnlyList<RespostaPessoaRsvp> respostas, Dictionary<Guid, Convidado> titulares)
    {
        if (respostas.Any(resposta => resposta is null || !titulares.ContainsKey(resposta.ConvidadoId)))
        {
            throw new RegraNegocioException(MensagensConvidados.ConvidadoDeOutroConvite);
        }

        if (respostas.Select(resposta => resposta.ConvidadoId).Distinct().Count() != respostas.Count)
        {
            throw new RegraNegocioException(MensagensConvidados.ConvidadoRepetido);
        }

        if (respostas.Count != titulares.Count)
        {
            throw new RegraNegocioException(MensagensConvidados.RespostaIncompleta);
        }

        if (respostas.Any(resposta => resposta.Resposta is not (RespostaRsvp.Confirmado or RespostaRsvp.Recusado)))
        {
            throw new RegraNegocioException(MensagensConvidados.RespostaPresencaInvalida);
        }
    }

    private static List<DadosAcompanhanteRsvp> NormalizarAcompanhantes(
        IReadOnlyList<DadosAcompanhanteRsvp> acompanhantes,
        Dictionary<Guid, Convidado> acompanhantesAtuais)
    {
        if (acompanhantes.Any(acompanhante => acompanhante is null))
        {
            throw new RegraNegocioException(MensagensConvidados.NomeAcompanhanteObrigatorio);
        }

        var identificadores = acompanhantes
            .Where(acompanhante => acompanhante.Id is not null)
            .Select(acompanhante => acompanhante.Id!.Value)
            .ToList();

        if (identificadores.Exists(identificador => !acompanhantesAtuais.ContainsKey(identificador)))
        {
            throw new RegraNegocioException(MensagensConvidados.ConvidadoDeOutroConvite);
        }

        if (identificadores.Distinct().Count() != identificadores.Count)
        {
            throw new RegraNegocioException(MensagensConvidados.ConvidadoRepetido);
        }

        return acompanhantes
            .Select(acompanhante =>
            {
                if (!Enum.IsDefined(acompanhante.FaixaEtaria))
                {
                    throw new RegraNegocioException(MensagensConvidados.FaixaEtariaInvalida);
                }

                return acompanhante with { Nome = Convidado.NormalizarNomeAcompanhante(acompanhante.Nome) };
            })
            .ToList();
    }

    private List<(Convidado Acompanhante, DadosAcompanhanteRsvp Dados)> SincronizarAcompanhantes(
        List<DadosAcompanhanteRsvp> normalizados,
        IEnumerable<Convidado> titulares,
        DateTimeOffset agora)
    {
        var sincronizados = new List<(Convidado Acompanhante, DadosAcompanhanteRsvp Dados)>(normalizados.Count);

        var mantidos = normalizados
            .Where(acompanhante => acompanhante.Id is not null)
            .Select(acompanhante => acompanhante.Id!.Value)
            .ToHashSet();

        _convidados.RemoveAll(convidado => convidado.Acompanhante && !mantidos.Contains(convidado.Id));

        var proximaOrdem = titulares.Select(convidado => convidado.Ordem).DefaultIfEmpty(-1).Max() + 1;

        foreach (var acompanhante in normalizados)
        {
            Convidado pessoa;

            if (acompanhante.Id is { } identificador)
            {
                pessoa = _convidados.First(convidado => convidado.Id == identificador);
                pessoa.AtualizarAcompanhante(acompanhante.Nome!, acompanhante.FaixaEtaria, proximaOrdem, agora);
            }
            else
            {
                pessoa = Convidado.CriarAcompanhante(CasamentoId, Id, acompanhante.Nome!, acompanhante.FaixaEtaria, proximaOrdem, agora);
                _convidados.Add(pessoa);
            }

            sincronizados.Add((pessoa, acompanhante));
            proximaOrdem++;
        }

        return sincronizados;
    }

    private void Aplicar(DadosConvite dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        var informados = dados.Convidados ?? [];

        if (informados.Count is < ConvidadosMinimo or > ConvidadosMaximo)
        {
            throw new RegraNegocioException(MensagensConvidados.QuantidadeConvidados);
        }

        var normalizados = informados.Select(Convidado.Normalizar).ToList();
        ValidarIdentificadores(normalizados);

        var grupo = NormalizadorTexto.Normalizar(dados.Grupo);

        if (grupo is { Length: > TamanhoMaximoGrupo })
        {
            throw new RegraNegocioException(MensagensConvidados.TamanhoGrupo);
        }

        if (dados.LimiteAcompanhantes is < LimiteAcompanhantesMinimo or > LimiteAcompanhantesMaximo)
        {
            throw new RegraNegocioException(MensagensConvidados.LimiteAcompanhantesForaDaFaixa);
        }

        var nome = NormalizadorTexto.Normalizar(dados.Nome) ?? normalizados[0].Nome!;

        if (nome.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensConvidados.TamanhoNome);
        }

        Nome = nome;
        Grupo = grupo;
        LimiteAcompanhantes = dados.LimiteAcompanhantes;
        SincronizarConvidados(normalizados, agora);
        AtualizadoEm = agora;
    }

    private void ValidarIdentificadores(List<DadosConvidado> normalizados)
    {
        var identificadores = normalizados
            .Where(convidado => convidado.Id is not null)
            .Select(convidado => convidado.Id!.Value)
            .ToList();

        if (identificadores.Distinct().Count() != identificadores.Count)
        {
            throw new RegraNegocioException(MensagensConvidados.ConvidadoRepetido);
        }

        var existentes = _convidados.Select(convidado => convidado.Id).ToHashSet();

        if (identificadores.Exists(identificador => !existentes.Contains(identificador)))
        {
            throw new RegraNegocioException(MensagensConvidados.ConvidadoDeOutroConvite);
        }
    }

    private void SincronizarConvidados(List<DadosConvidado> normalizados, DateTimeOffset agora)
    {
        var mantidos = normalizados
            .Where(convidado => convidado.Id is not null)
            .Select(convidado => convidado.Id!.Value)
            .ToHashSet();

        _convidados.RemoveAll(convidado => !mantidos.Contains(convidado.Id));

        for (var ordem = 0; ordem < normalizados.Count; ordem++)
        {
            var dadosConvidado = normalizados[ordem];

            if (dadosConvidado.Id is { } identificador)
            {
                _convidados.First(convidado => convidado.Id == identificador).Atualizar(dadosConvidado, ordem, agora);
                continue;
            }

            _convidados.Add(Convidado.Criar(CasamentoId, Id, dadosConvidado, ordem, agora));
        }
    }
}
