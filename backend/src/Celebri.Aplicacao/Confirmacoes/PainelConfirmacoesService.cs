using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Microsoft.Extensions.Logging;

namespace Celebri.Aplicacao.Confirmacoes;

public partial class PainelConfirmacoesService : IPainelConfirmacoesService
{
    private readonly IConviteRepository _conviteRepository;
    private readonly IAcessoRsvpRepository _acessoRepository;
    private readonly VerificadorEventoConvidados _verificador;
    private readonly IRestricaoAlimentarService _restricaoAlimentarService;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly IDadosSensiveisRepository _dadosSensiveisRepository;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly ILogger<PainelConfirmacoesService> _logger;

    public PainelConfirmacoesService(
        IEventoRepository eventoRepository,
        IConviteRepository conviteRepository,
        IAcessoRsvpRepository acessoRepository,
        IRestricaoAlimentarService restricaoAlimentarService,
        IDadosSensiveisRepository dadosSensiveisRepository,
        IUsuarioAtual usuarioAtual,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        ILogger<PainelConfirmacoesService> logger)
    {
        _conviteRepository = conviteRepository;
        _acessoRepository = acessoRepository;
        _verificador = new VerificadorEventoConvidados(eventoRepository, conviteRepository);
        _restricaoAlimentarService = restricaoAlimentarService;
        _dadosSensiveisRepository = dadosSensiveisRepository;
        _usuarioAtual = usuarioAtual;
        _calendario = calendario;
        _relogio = relogio;
        _logger = logger;
    }

    public async Task<PainelConfirmacoesDto> ObterAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterAsync(eventoId, cancelamento);
        var convites = await _conviteRepository.ListarSemDadosSensiveisAsync(evento.Id, cancelamento);
        var convitesComLink = await _acessoRepository.ListarConvitesComLinkAsync(evento.Id, cancelamento);
        var pessoasComRestricao = await _dadosSensiveisRepository.ContarPessoasComRestricaoAsync(evento.Id, cancelamento);
        return CalculadoraPainelConfirmacoes.Calcular(evento, convites, _calendario.Hoje(), convitesComLink) with
        {
            PessoasComRestricaoAlimentar = pessoasComRestricao,
        };
    }

    public async Task<ExportacaoBuffetDto> ExportarBuffetAsync(Guid eventoId, ExportarBuffetRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var formato = request.ParaFormato();
        var evento = await _verificador.ObterAsync(eventoId, cancelamento);
        var convites = await _conviteRepository.ListarSemDadosSensiveisAsync(evento.Id, cancelamento);
        var relatorio = await _restricaoAlimentarService.ObterRelatorioAsync(evento.Id, cancelamento);

        var exportacao = MontadorExportacaoBuffet.Montar(evento, convites, relatorio, _relogio.GetUtcNow());
        RegistrarExportacao(evento.Id, _usuarioAtual.UsuarioId, formato, MontadorExportacaoBuffet.ContarPessoas(exportacao));

        return exportacao;
    }

    [LoggerMessage(
        EventId = 9102,
        Level = LogLevel.Information,
        Message = "Exportação para o buffet gerada: evento {EventoId}, usuário {UsuarioId}, formato {Formato}, {Quantidade} pessoas confirmadas.")]
    private partial void RegistrarExportacao(Guid eventoId, Guid? usuarioId, FormatoExportacaoBuffet formato, int quantidade);
}
