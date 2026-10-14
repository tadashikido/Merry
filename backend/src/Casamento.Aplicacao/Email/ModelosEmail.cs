using System.Text.Encodings.Web;

namespace Casamento.Aplicacao.Email;

public static class ModelosEmail
{
    public const string AssuntoRedefinicaoSenha = "Redefinição de senha — Enlace";

    public static string AssuntoConviteAcessoCasal(string nomesCasal) => $"Convite para acompanhar o casamento de {nomesCasal}";

    public static MensagemEmail ConviteAcessoCasal(
        string nome,
        string email,
        string link,
        string nomesCasal,
        string organizacao,
        int validadeDias)
    {
        var validade = validadeDias == 1 ? "1 dia" : $"{validadeDias} dias";

        var texto = string.Join(
            "\n",
            $"Olá, {nome}.",
            string.Empty,
            $"{organizacao} convidou você para acompanhar a lista de convidados do casamento de {nomesCasal}.",
            $"Crie sua senha pelo link abaixo em até {validade}:",
            link,
            string.Empty,
            "Não esperava este convite? Ignore este e-mail; ninguém entra sem a senha.");

        var html = HtmlEncoder.Default;
        var corpoHtml = string.Concat(
            $"<p>Olá, {html.Encode(nome)}.</p>",
            $"<p>{html.Encode(organizacao)} convidou você para acompanhar a lista de convidados do casamento de {html.Encode(nomesCasal)}.</p>",
            $"<p>Crie sua senha pelo link abaixo em até {html.Encode(validade)}:</p>",
            $"<p><a href=\"{html.Encode(link)}\">Aceitar convite</a></p>",
            "<p>Não esperava este convite? Ignore este e-mail; ninguém entra sem a senha.</p>");

        return new MensagemEmail(email, nome, AssuntoConviteAcessoCasal(nomesCasal), texto, corpoHtml);
    }

    public static MensagemEmail RedefinicaoSenha(string nome, string email, string link, int validadeMinutos)
    {
        var validade = validadeMinutos % 60 == 0 && validadeMinutos >= 60
            ? validadeMinutos == 60 ? "1 hora" : $"{validadeMinutos / 60} horas"
            : $"{validadeMinutos} minutos";

        var texto = string.Join(
            "\n",
            $"Olá, {nome}.",
            string.Empty,
            "Recebemos um pedido para redefinir a senha da sua conta.",
            $"Use o link abaixo em até {validade}:",
            link,
            string.Empty,
            "Se não foi você, ignore este e-mail; sua senha continua a mesma.");

        var html = HtmlEncoder.Default;
        var corpoHtml = string.Concat(
            $"<p>Olá, {html.Encode(nome)}.</p>",
            "<p>Recebemos um pedido para redefinir a senha da sua conta.</p>",
            $"<p>Use o link abaixo em até {html.Encode(validade)}:</p>",
            $"<p><a href=\"{html.Encode(link)}\">Criar uma nova senha</a></p>",
            "<p>Se não foi você, ignore este e-mail; sua senha continua a mesma.</p>");

        return new MensagemEmail(email, nome, AssuntoRedefinicaoSenha, texto, corpoHtml);
    }
}
