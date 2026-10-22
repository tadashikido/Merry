using Casamento.Aplicacao.Email;

namespace Casamento.Testes.Unidade.Autenticacao.Fakes;

public class EnvioEmailFalso : IEnvioEmailService
{
    public List<MensagemEmail> Enviadas { get; } = [];

    public bool Falhar { get; set; }

    public Task EnviarAsync(MensagemEmail mensagem, CancellationToken cancelamento)
    {
        if (Falhar)
        {
            throw new InvalidOperationException("SMTP indisponível");
        }

        Enviadas.Add(mensagem);
        return Task.CompletedTask;
    }
}
