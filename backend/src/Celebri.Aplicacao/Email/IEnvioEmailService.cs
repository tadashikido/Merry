namespace Celebri.Aplicacao.Email;

public interface IEnvioEmailService
{
    Task EnviarAsync(MensagemEmail mensagem, CancellationToken cancelamento);
}
