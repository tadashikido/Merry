using System.Collections.Concurrent;
using Celebri.Aplicacao.Email;

namespace Celebri.Testes.Integracao.Infraestrutura;

public class EnvioEmailMemoria : IEnvioEmailService
{
    public ConcurrentQueue<MensagemEmail> Enviadas { get; } = new();

    public Task EnviarAsync(MensagemEmail mensagem, CancellationToken cancelamento)
    {
        Enviadas.Enqueue(mensagem);
        return Task.CompletedTask;
    }
}
