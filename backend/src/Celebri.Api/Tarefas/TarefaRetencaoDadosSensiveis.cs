using Celebri.Aplicacao.DadosSensiveis;
using Microsoft.Extensions.Options;

namespace Celebri.Api.Tarefas;

public sealed partial class TarefaRetencaoDadosSensiveis : BackgroundService
{
    private readonly IExecutorRetencaoDadosSensiveis _executor;
    private readonly TimeSpan _intervalo;
    private readonly ILogger<TarefaRetencaoDadosSensiveis> _logger;

    public TarefaRetencaoDadosSensiveis(
        IExecutorRetencaoDadosSensiveis executor,
        IOptions<OpcoesRetencaoDadosSensiveis> opcoes,
        ILogger<TarefaRetencaoDadosSensiveis> logger)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        _executor = executor;
        _intervalo = TimeSpan.FromMinutes(opcoes.Value.IntervaloMinutos);
        _logger = logger;
    }

    public async Task ExecutarCicloAsync(CancellationToken cancelamento)
    {
        try
        {
            await _executor.ExecutarAsync(cancelamento);
        }
        catch (OperationCanceledException) when (cancelamento.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception excecao) when (excecao is not OutOfMemoryException)
        {
            RegistrarFalha(excecao.GetType().Name);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var temporizador = new PeriodicTimer(_intervalo);

        try
        {
            do
            {
                await ExecutarCicloAsync(stoppingToken);
            }
            while (await temporizador.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }
    }

    [LoggerMessage(
        EventId = 9202,
        Level = LogLevel.Error,
        Message = "Falha na retenção de dados sensíveis ({TipoFalha}); nova tentativa no próximo ciclo.")]
    private partial void RegistrarFalha(string tipoFalha);
}
