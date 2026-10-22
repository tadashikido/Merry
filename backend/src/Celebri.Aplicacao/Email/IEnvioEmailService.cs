namespace Casamento.Aplicacao.Email;

public interface IEnvioEmailService
{
    Task EnviarAsync(MensagemEmail mensagem, CancellationToken cancelamento);
}
