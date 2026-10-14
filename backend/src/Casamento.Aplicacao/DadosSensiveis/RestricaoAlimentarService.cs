using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.DadosSensiveis;
using Casamento.Dominio.Excecoes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Casamento.Aplicacao.DadosSensiveis;

public partial class RestricaoAlimentarService : IRestricaoAlimentarService
{
    private readonly IConviteRepository _conviteRepository;
    private readonly IDadosSensiveisRepository _dadosSensiveisRepository;
    private readonly VerificadorCasamentoConvidados _verificador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly CifragemRestricaoAlimentar _cifragem;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly OpcoesRetencaoDadosSensiveis _opcoesRetencao;
    private readonly ILogger<RestricaoAlimentarService> _logger;

    public RestricaoAlimentarService(
        ICasamentoRepository casamentoRepository,
        IConviteRepository conviteRepository,
        IDadosSensiveisRepository dadosSensiveisRepository,
        IUnidadeTrabalho unidadeTrabalho,
        CifragemRestricaoAlimentar cifragem,
        IUsuarioAtual usuarioAtual,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IOptions<OpcoesRetencaoDadosSensiveis> opcoesRetencao,
        ILogger<RestricaoAlimentarService> logger)
    {
        ArgumentNullException.ThrowIfNull(opcoesRetencao);

        _conviteRepository = conviteRepository;
        _dadosSensiveisRepository = dadosSensiveisRepository;
        _verificador = new VerificadorCasamentoConvidados(casamentoRepository, conviteRepository);
        _unidadeTrabalho = unidadeTrabalho;
        _cifragem = cifragem;
        _usuarioAtual = usuarioAtual;
        _calendario = calendario;
        _relogio = relogio;
        _opcoesRetencao = opcoesRetencao.Value;
        _logger = logger;
    }

    public async Task<RelatorioRestricoesAlimentaresDto> ObterRelatorioAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterAsync(casamentoId, cancelamento);
        var registros = await _dadosSensiveisRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);

        var pessoas = new List<PessoaRestricaoAlimentarDto>();
        var restricoesConfirmadas = new List<RestricaoAlimentar>();
        var ilegiveis = 0;

        foreach (var registro in registros.Where(registro => registro.ConteudoCifrado is not null && registro.Resposta != RespostaRsvp.Recusado))
        {
            var restricao = _cifragem.Ler(registro.ConteudoCifrado!, registro.ConvidadoId);

            if (restricao is null)
            {
                ilegiveis++;
                continue;
            }

            if (registro.Resposta == RespostaRsvp.Confirmado)
            {
                restricoesConfirmadas.Add(restricao);
            }

            pessoas.Add(new PessoaRestricaoAlimentarDto(
                registro.ConvidadoId,
                registro.ConviteId,
                registro.Nome,
                registro.Acompanhante,
                registro.Resposta.ToString(),
                restricao.Tipos.Select(tipo => tipo.ToString()).ToList(),
                restricao.OutraRestricao,
                restricao.NecessidadeEspecial,
                registro.OrigemConsentimento.ToString(),
                registro.ConsentidoEm));
        }

        var porTipo = restricoesConfirmadas
            .SelectMany(restricao => restricao.Tipos)
            .GroupBy(tipo => tipo)
            .Select(grupo => new ContagemRestricaoDto(grupo.Key.ToString(), grupo.Count()))
            .OrderByDescending(contagem => contagem.Quantidade)
            .ThenBy(contagem => contagem.Tipo, StringComparer.Ordinal)
            .ToList();

        var excluidosEm = registros
            .Where(registro => registro.ExcluidoEm is not null)
            .Select(registro => registro.ExcluidoEm)
            .DefaultIfEmpty(null)
            .Max();

        RegistrarConsulta(casamento.Id, _usuarioAtual.UsuarioId, pessoas.Count);

        return new RelatorioRestricoesAlimentaresDto(
            pessoas.Count,
            restricoesConfirmadas.Count,
            porTipo,
            restricoesConfirmadas.Count(restricao => restricao.OutraRestricao is not null),
            restricoesConfirmadas.Count(restricao => restricao.NecessidadeEspecial is not null),
            pessoas.OrderBy(pessoa => pessoa.Nome, StringComparer.CurrentCultureIgnoreCase).ToList(),
            _opcoesRetencao.DiasAposCasamento,
            _opcoesRetencao.DataExclusao(casamento.Data),
            excluidosEm,
            ilegiveis,
            PodeRegistrar(casamento));
    }

    public async Task<RestricaoAlimentarDto> SalvarAsync(
        Guid casamentoId,
        Guid conviteId,
        Guid convidadoId,
        SalvarRestricaoAlimentarRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (casamento, convite) = await ObterPessoaAsync(casamentoId, conviteId, convidadoId, cancelamento);

        if (_opcoesRetencao.RetencaoEncerrada(casamento.Data, _calendario.Hoje()))
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.RetencaoEncerrada);
        }

        if (request.ConsentimentoObtido != true)
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.ConsentimentoObtidoObrigatorio);
        }

        var restricao = request.ParaRestricaoRequest().ParaRestricao()
            ?? throw new RegraNegocioException(MensagensDadosSensiveis.ConteudoObrigatorio);

        var usuarioId = _usuarioAtual.UsuarioId
            ?? throw new InvalidOperationException(MensagensDadosSensiveis.UsuarioObrigatorio);

        var agora = _relogio.GetUtcNow();
        var consentimento = new ConsentimentoDadosSensiveis(agora, TermoPrivacidadeRsvp.VersaoVigente, OrigemConsentimento.Cerimonialista, usuarioId);

        convite.RegistrarDadosSensiveis(convidadoId, AlteracaoDadosSensiveis.Informar(restricao), consentimento, _cifragem.Cifrar, agora);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new RestricaoAlimentarDto(
            restricao.Tipos.Select(tipo => tipo.ToString()).ToList(),
            restricao.OutraRestricao,
            restricao.NecessidadeEspecial,
            consentimento.Origem.ToString(),
            consentimento.ConsentidoEm);
    }

    public async Task RemoverAsync(Guid casamentoId, Guid conviteId, Guid convidadoId, CancellationToken cancelamento)
    {
        var (_, convite) = await ObterPessoaAsync(casamentoId, conviteId, convidadoId, cancelamento);

        convite.RegistrarDadosSensiveis(convidadoId, AlteracaoDadosSensiveis.Remover, null, _cifragem.Cifrar, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    private bool PodeRegistrar(CasamentoAssessorado casamento)
    {
        return !casamento.Arquivado && !_opcoesRetencao.RetencaoEncerrada(casamento.Data, _calendario.Hoje());
    }

    private async Task<(CasamentoAssessorado Casamento, Convite Convite)> ObterPessoaAsync(
        Guid casamentoId,
        Guid conviteId,
        Guid convidadoId,
        CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterEditavelAsync(casamentoId, cancelamento);
        var convite = await _conviteRepository.ObterPorIdAsync(casamento.Id, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);

        if (!convite.Convidados.Any(convidado => convidado.Id == convidadoId))
        {
            throw new RecursoNaoEncontradoException(MensagensDadosSensiveis.ConvidadoNaoEncontrado);
        }

        return (casamento, convite);
    }

    [LoggerMessage(
        EventId = 9101,
        Level = LogLevel.Information,
        Message = "Relatório de restrições alimentares consultado: casamento {CasamentoId}, usuário {UsuarioId}, {Quantidade} pessoas listadas.")]
    private partial void RegistrarConsulta(Guid casamentoId, Guid? usuarioId, int quantidade);
}
