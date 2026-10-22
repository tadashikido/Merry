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
    private readonly VerificadorCasamentoConvidados _verificador;
    private readonly IRestricaoAlimentarService _restricaoAlimentarService;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly IDadosSensiveisRepository _dadosSensiveisRepository;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly ILogger<PainelConfirmacoesService> _logger;

    public PainelConfirmacoesService(
        ICasamentoRepository casamentoRepository,
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
        _verificador = new VerificadorCasamentoConvidados(casamentoRepository, conviteRepository);
        _restricaoAlimentarService = restricaoAlimentarService;
        _dadosSensiveisRepository = dadosSensiveisRepository;
        _usuarioAtual = usuarioAtual;
        _calendario = calendario;
        _relogio = relogio;
        _logger = logger;
    }

    public async Task<PainelConfirmacoesDto> ObterAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterAsync(casamentoId, cancelamento);
        var convites = await _conviteRepository.ListarSemDadosSensiveisAsync(casamento.Id, cancelamento);
        var convitesComLink = await _acessoRepository.ListarConvitesComLinkAsync(casamento.Id, cancelamento);
        var pessoasComRestricao = await _dadosSensiveisRepository.ContarPessoasComRestricaoAsync(casamento.Id, cancelamento);
        return CalculadoraPainelConfirmacoes.Calcular(casamento, convites, _calendario.Hoje(), convitesComLink) with
        {
            PessoasComRestricaoAlimentar = pessoasComRestricao,
        };
    }

    public async Task<ExportacaoBuffetDto> ExportarBuffetAsync(Guid casamentoId, ExportarBuffetRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var formato = request.ParaFormato();
        var casamento = await _verificador.ObterAsync(casamentoId, cancelamento);
        var convites = await _conviteRepository.ListarSemDadosSensiveisAsync(casamento.Id, cancelamento);
        var relatorio = await _restricaoAlimentarService.ObterRelatorioAsync(casamento.Id, cancelamento);

        var exportacao = MontadorExportacaoBuffet.Montar(casamento, convites, relatorio, _relogio.GetUtcNow());
        RegistrarExportacao(casamento.Id, _usuarioAtual.UsuarioId, formato, MontadorExportacaoBuffet.ContarPessoas(exportacao));

        return exportacao;
    }

    [LoggerMessage(
        EventId = 9102,
        Level = LogLevel.Information,
        Message = "Exportação para o buffet gerada: casamento {CasamentoId}, usuário {UsuarioId}, formato {Formato}, {Quantidade} pessoas confirmadas.")]
    private partial void RegistrarExportacao(Guid casamentoId, Guid? usuarioId, FormatoExportacaoBuffet formato, int quantidade);
}
