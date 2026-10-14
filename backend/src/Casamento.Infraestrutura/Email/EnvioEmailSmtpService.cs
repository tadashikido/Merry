using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using Casamento.Aplicacao.Email;
using Microsoft.Extensions.Options;

namespace Casamento.Infraestrutura.Email;

public class EnvioEmailSmtpService : IEnvioEmailService
{
    private readonly OpcoesEmail _opcoes;

    public EnvioEmailSmtpService(IOptions<OpcoesEmail> opcoes)
    {
        _opcoes = opcoes.Value;
    }

    public async Task EnviarAsync(MensagemEmail mensagem, CancellationToken cancelamento)
    {
        using var email = new MailMessage
        {
            From = new MailAddress(_opcoes.Remetente, _opcoes.NomeRemetente, Encoding.UTF8),
            Subject = mensagem.Assunto,
            SubjectEncoding = Encoding.UTF8,
            Body = mensagem.CorpoTexto,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = false,
        };
        email.To.Add(new MailAddress(mensagem.Destinatario, mensagem.NomeDestinatario, Encoding.UTF8));
        email.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(mensagem.CorpoHtml, Encoding.UTF8, MediaTypeNames.Text.Html));

        using var cliente = new SmtpClient(_opcoes.Smtp.Host, _opcoes.Smtp.Porta)
        {
            EnableSsl = _opcoes.Smtp.UsarSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        if (!string.IsNullOrWhiteSpace(_opcoes.Smtp.Usuario))
        {
            cliente.Credentials = new NetworkCredential(_opcoes.Smtp.Usuario, _opcoes.Smtp.Senha);
        }

        await cliente.SendMailAsync(email, cancelamento);
    }
}
