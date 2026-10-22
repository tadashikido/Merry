using Celebri.Dominio.DadosSensiveis;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Mesas;

namespace Celebri.Dominio.Convidados;

public class Convidado : IPertenceEvento
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;

    private Convidado()
    {
        Nome = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid EventoId { get; private set; }

    public Guid ConviteId { get; private set; }

    public string Nome { get; private set; }

    public string? Telefone { get; private set; }

    public string? Email { get; private set; }

    public FaixaEtaria FaixaEtaria { get; private set; }

    public RespostaRsvp Resposta { get; private set; }

    public int Ordem { get; private set; }

    public bool Acompanhante { get; private set; }

    public Guid? MesaId { get; private set; }

    public Guid? MesaSaidaId { get; private set; }

    public DateTimeOffset? SaiuDaMesaEm { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public DadosSensiveisConvidado? DadosSensiveis { get; private set; }

    public bool PossuiRestricaoAlimentar => DadosSensiveis?.Vigente == true;

    internal static Convidado Criar(Guid eventoId, Guid conviteId, DadosConvidado dadosNormalizados, int ordem, DateTimeOffset agora)
    {
        var convidado = new Convidado
        {
            Id = Guid.NewGuid(),
            EventoId = eventoId,
            ConviteId = conviteId,
            CriadoEm = agora,
        };

        convidado.Aplicar(dadosNormalizados, ordem, agora);
        return convidado;
    }

    internal void Atualizar(DadosConvidado dadosNormalizados, int ordem, DateTimeOffset agora)
    {
        Aplicar(dadosNormalizados, ordem, agora);
    }

    internal static Convidado CriarAcompanhante(Guid eventoId, Guid conviteId, string nome, FaixaEtaria faixaEtaria, int ordem, DateTimeOffset agora)
    {
        return new Convidado
        {
            Id = Guid.NewGuid(),
            EventoId = eventoId,
            ConviteId = conviteId,
            Nome = nome,
            FaixaEtaria = faixaEtaria,
            Resposta = RespostaRsvp.Confirmado,
            Ordem = ordem,
            Acompanhante = true,
            CriadoEm = agora,
            AtualizadoEm = agora,
        };
    }

    internal void Responder(RespostaRsvp resposta, DateTimeOffset agora)
    {
        if (Resposta == resposta)
        {
            return;
        }

        AplicarResposta(resposta, agora);
        AtualizadoEm = agora;
    }

    internal void Sentar(Guid mesaId, DateTimeOffset agora)
    {
        if (Resposta != RespostaRsvp.Confirmado)
        {
            throw new RegraNegocioException(MensagensMesas.SomenteConfirmados);
        }

        MesaId = mesaId;
        MesaSaidaId = null;
        SaiuDaMesaEm = null;
        AtualizadoEm = agora;
    }

    public bool Levantar(DateTimeOffset agora)
    {
        if (MesaId is null)
        {
            return false;
        }

        MesaId = null;
        AtualizadoEm = agora;
        return true;
    }

    public bool DispensarAvisoSaidaMesa(DateTimeOffset agora)
    {
        if (SaiuDaMesaEm is null)
        {
            return false;
        }

        MesaSaidaId = null;
        SaiuDaMesaEm = null;
        AtualizadoEm = agora;
        return true;
    }

    internal void AtualizarAcompanhante(string nome, FaixaEtaria faixaEtaria, int ordem, DateTimeOffset agora)
    {
        Nome = nome;
        FaixaEtaria = faixaEtaria;
        Resposta = RespostaRsvp.Confirmado;
        Ordem = ordem;
        AtualizadoEm = agora;
    }

    internal void AlterarDadosSensiveis(
        AlteracaoDadosSensiveis alteracao,
        ConsentimentoDadosSensiveis? consentimento,
        Func<RestricaoAlimentar, Guid, string> cifrar,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(alteracao);
        ArgumentNullException.ThrowIfNull(cifrar);

        switch (alteracao.Tipo)
        {
            case TipoAlteracaoDadosSensiveis.Remover:
                DadosSensiveis = null;
                return;
            case TipoAlteracaoDadosSensiveis.Informar:
                if (consentimento is null)
                {
                    throw new RegraNegocioException(MensagensDadosSensiveis.ConsentimentoObrigatorio);
                }

                var cifra = cifrar(alteracao.Restricao!, Id);

                if (DadosSensiveis is null)
                {
                    DadosSensiveis = DadosSensiveisConvidado.Criar(Id, EventoId, cifra, consentimento, agora);
                }
                else
                {
                    DadosSensiveis.Substituir(cifra, consentimento, agora);
                }

                return;
            default:
                return;
        }
    }

    internal static string NormalizarNomeAcompanhante(string? nome)
    {
        var normalizado = NormalizadorTexto.Normalizar(nome)
            ?? throw new RegraNegocioException(MensagensConvidados.NomeAcompanhanteObrigatorio);

        if (normalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensConvidados.TamanhoNomeAcompanhante);
        }

        return normalizado;
    }

    internal static DadosConvidado Normalizar(DadosConvidado dados)
    {
        ArgumentNullException.ThrowIfNull(dados);

        var nome = NormalizadorTexto.Normalizar(dados.Nome)
            ?? throw new RegraNegocioException(MensagensConvidados.NomeObrigatorio);

        if (nome.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensConvidados.TamanhoNome);
        }

        if (!NormalizadorTelefone.TentarNormalizar(dados.Telefone, out var telefone))
        {
            throw new RegraNegocioException(MensagensConvidados.TelefoneInvalido);
        }

        if (!ValidadorEmailConvidado.Valido(dados.Email))
        {
            throw new RegraNegocioException(MensagensConvidados.EmailInvalido);
        }

        if (!Enum.IsDefined(dados.FaixaEtaria))
        {
            throw new RegraNegocioException(MensagensConvidados.FaixaEtariaInvalida);
        }

        if (!Enum.IsDefined(dados.Resposta))
        {
            throw new RegraNegocioException(MensagensConvidados.RespostaInvalida);
        }

        var email = string.IsNullOrWhiteSpace(dados.Email) ? null : dados.Email.Trim().ToLowerInvariant();

        return dados with { Nome = nome, Telefone = telefone, Email = email };
    }

    private void Aplicar(DadosConvidado dadosNormalizados, int ordem, DateTimeOffset agora)
    {
        Nome = dadosNormalizados.Nome!;
        Telefone = dadosNormalizados.Telefone;
        Email = dadosNormalizados.Email;
        FaixaEtaria = dadosNormalizados.FaixaEtaria;
        AplicarResposta(dadosNormalizados.Resposta, agora);
        Ordem = ordem;
        AtualizadoEm = agora;
    }

    private void AplicarResposta(RespostaRsvp resposta, DateTimeOffset agora)
    {
        Resposta = resposta;

        if (resposta == RespostaRsvp.Confirmado || MesaId is null)
        {
            return;
        }

        MesaSaidaId = MesaId;
        SaiuDaMesaEm = agora;
        MesaId = null;
    }
}
