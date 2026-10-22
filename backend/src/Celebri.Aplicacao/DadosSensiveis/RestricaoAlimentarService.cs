using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.DadosSensiveis;
using Celebri.Dominio.Excecoes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.DadosSensiveis;

public partial class RestricaoAlimentarService : IRestricaoAlimentarService
{
    private readonly IConviteRepository _conviteRepository;
    private readonly IDadosSensiveisRepository _dadosSensiveisRepository;
    private readonly VerificadorEventoConvidados _verificador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly CifragemRestricaoAlimentar _cifragem;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly OpcoesRetencaoDadosSensiveis _opcoesRetencao;
    private readonly ILogger<RestricaoAlimentarService> _logger;

    public RestricaoAlimentarService(
        IEventoRepository eventoRepository,
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
        _verificador = new VerificadorEventoConvidados(eventoRepository, conviteRepository);
        _unidadeTrabalho = unidadeTrabalho;
        _cifragem = cifragem;
        _usuarioAtual = usuarioAtual;
        _calendario = calendario;
        _relogio = relogio;
        _opcoesRetencao = opcoesRetencao.Value;
        _logger = logger;
    }

    public async Task<RelatorioRestricoesAlimentaresDto> ObterRelatorioAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterAsync(eventoId, cancelamento);
        var registros = await _dadosSensiveisRepository.ListarPorEventoAsync(evento.Id, cancelamento);

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

        RegistrarConsulta(evento.Id, _usuarioAtual.UsuarioId, pessoas.Count);

        return new RelatorioRestricoesAlimentaresDto(
            pessoas.Count,
            restricoesConfirmadas.Count,
            porTipo,
            restricoesConfirmadas.Count(restricao => restricao.OutraRestricao is not null),
            restricoesConfirmadas.Count(restricao => restricao.NecessidadeEspecial is not null),
            pessoas.OrderBy(pessoa => pessoa.Nome, StringComparer.CurrentCultureIgnoreCase).ToList(),
            _opcoesRetencao.DiasAposEvento,
            _opcoesRetencao.DataExclusao(evento.Data),
            excluidosEm,
            ilegiveis,
            PodeRegistrar(evento));
    }

    public async Task<RestricaoAlimentarDto> SalvarAsync(
        Guid eventoId,
        Guid conviteId,
        Guid convidadoId,
        SalvarRestricaoAlimentarRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (evento, convite) = await ObterPessoaAsync(eventoId, conviteId, convidadoId, cancelamento);

        if (_opcoesRetencao.RetencaoEncerrada(evento.Data, _calendario.Hoje()))
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

    public async Task RemoverAsync(Guid eventoId, Guid conviteId, Guid convidadoId, CancellationToken cancelamento)
    {
        var (_, convite) = await ObterPessoaAsync(eventoId, conviteId, convidadoId, cancelamento);

        convite.RegistrarDadosSensiveis(convidadoId, AlteracaoDadosSensiveis.Remover, null, _cifragem.Cifrar, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    private bool PodeRegistrar(Evento evento)
    {
        return !evento.Arquivado && !_opcoesRetencao.RetencaoEncerrada(evento.Data, _calendario.Hoje());
    }

    private async Task<(Evento Evento, Convite Convite)> ObterPessoaAsync(
        Guid eventoId,
        Guid conviteId,
        Guid convidadoId,
        CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterEditavelAsync(eventoId, cancelamento);
        var convite = await _conviteRepository.ObterPorIdAsync(evento.Id, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);

        if (!convite.Convidados.Any(convidado => convidado.Id == convidadoId))
        {
            throw new RecursoNaoEncontradoException(MensagensDadosSensiveis.ConvidadoNaoEncontrado);
        }

        return (evento, convite);
    }

    [LoggerMessage(
        EventId = 9101,
        Level = LogLevel.Information,
        Message = "Relatório de restrições alimentares consultado: evento {EventoId}, usuário {UsuarioId}, {Quantidade} pessoas listadas.")]
    private partial void RegistrarConsulta(Guid eventoId, Guid? usuarioId, int quantidade);
}
