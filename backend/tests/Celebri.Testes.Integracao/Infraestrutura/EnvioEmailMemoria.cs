using System.Collections.Concurrent;
using Casamento.Aplicacao.Email;

namespace Casamento.Testes.Integracao.Infraestrutura;

public class EnvioEmailMemoria : IEnvioEmailService
{
    public ConcurrentQueue<MensagemEmail> Enviadas { get; } = new();

    public Task EnviarAsync(MensagemEmail mensagem, CancellationToken cancelamento)
    {
        Enviadas.Enqueue(mensagem);
        return Task.CompletedTask;
    }
}
