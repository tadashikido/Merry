using Microsoft.Extensions.Logging;

namespace Celebri.Testes.Unidade.DadosSensiveis;

public sealed class RegistroLogsMemoria<T> : ILogger<T>
{
    public List<(LogLevel Nivel, string Mensagem, Exception? Excecao)> Entradas { get; } = [];

    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull
    {
        return null;
    }

    public bool IsEnabled(LogLevel logLevel)
    {
        return true;
    }

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        ArgumentNullException.ThrowIfNull(formatter);
        Entradas.Add((logLevel, formatter(state, exception), exception));
    }
}
