using Celebri.Aplicacao.Recifragem;

namespace Celebri.Api;

public static partial class ComandosAdministrativos
{
    public const string ComandoRecifragem = "recifrar-dados-sensiveis";
    public const int CodigoSucesso = 0;
    public const int CodigoFalha = 1;
    public const int CodigoRegistrosIlegiveis = 3;

    public static bool EhComandoAdministrativo(IReadOnlyList<string> argumentos)
    {
        ArgumentNullException.ThrowIfNull(argumentos);

        return argumentos.Count > 0 && string.Equals(argumentos[0], ComandoRecifragem, StringComparison.Ordinal);
    }

    public static async Task<int> ExecutarAsync(IServiceProvider servicos, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(servicos);

        var logger = servicos.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(ComandosAdministrativos));

        try
        {
            var resultado = await servicos.GetRequiredService<IExecutorRecifragemDadosSensiveis>().ExecutarAsync(cancelamento);

            if (resultado.PossuiIlegiveis)
            {
                RegistrarIlegiveis(logger, resultado.DadosSensiveis.Ilegiveis, resultado.LinksCronograma.Ilegiveis);
                return CodigoRegistrosIlegiveis;
            }

            RegistrarSucesso(logger);
            return CodigoSucesso;
        }
        catch (OperationCanceledException) when (cancelamento.IsCancellationRequested)
        {
            RegistrarFalha(logger, nameof(OperationCanceledException));
            return CodigoFalha;
        }
        catch (Exception excecao) when (excecao is not OutOfMemoryException)
        {
            RegistrarFalha(logger, excecao.GetType().Name);
            return CodigoFalha;
        }
    }

    [LoggerMessage(
        EventId = 9212,
        Level = LogLevel.Warning,
        Message = "Recifragem terminou com registros ilegíveis ({DadosSensiveis} dados sensíveis, {LinksCronograma} links de cronograma). Não descarte a chave anterior antes de investigar.")]
    private static partial void RegistrarIlegiveis(ILogger logger, int dadosSensiveis, int linksCronograma);

    [LoggerMessage(
        EventId = 9213,
        Level = LogLevel.Information,
        Message = "Recifragem concluída sem registros ilegíveis: todos os registros decifram com a chave atual.")]
    private static partial void RegistrarSucesso(ILogger logger);

    [LoggerMessage(
        EventId = 9214,
        Level = LogLevel.Error,
        Message = "Falha na recifragem de dados sensíveis ({TipoFalha}). Os lotes já gravados permanecem válidos; execute o comando novamente.")]
    private static partial void RegistrarFalha(ILogger logger, string tipoFalha);
}
