using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Microsoft.Extensions.Logging;

namespace Casamento.Aplicacao.Confirmacoes;

public partial class PainelConfirmacoesService : IPainelConfirmacoesService
{
    private readonly IConviteRepository _conviteRepository;
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
        IRestricaoAlimentarService restricaoAlimentarService,
        IDadosSensiveisRepository dadosSensiveisRepository,
        IUsuarioAtual usuarioAtual,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        ILogger<PainelConfirmacoesService> logger)
    {
        _conviteRepository = conviteRepository;
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
        var pessoasComRestricao = await _dadosSensiveisRepository.ContarPessoasComRestricaoAsync(casamento.Id, cancelamento);
        return CalculadoraPainelConfirmacoes.Calcular(casamento, convites, _calendario.Hoje()) with
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
