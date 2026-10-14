namespace Casamento.Aplicacao.Email;

public sealed record MensagemEmail(string Destinatario, string NomeDestinatario, string Assunto, string CorpoTexto, string CorpoHtml);
