using System.Net.Mail;
using Casamento.Aplicacao.Email;
using Casamento.Aplicacao.Sistema;
using Casamento.Infraestrutura.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Casamento.Testes.Unidade.Infraestrutura;

public class EnvioEmailSmtpServiceTestes
{
    private static readonly MensagemEmail Mensagem = new(
        "marina@exemplo.com",
        "Marina",
        "Convite para acompanhar o casamento de Marina & Pedro",
        "Olá, Marina.",
        "<p>Olá, Marina.</p>");

    [Fact]
    public void MontarMensagem_DeveUsarMarcaNossiaComoNomeDoRemetente()
    {
        var service = CriarService(new OpcoesEmail { Remetente = "nao-responda@exemplo.com" });

        using var email = service.MontarMensagem(Mensagem);

        Assert.NotNull(email.From);
        Assert.Equal(Marca.Nome, email.From.DisplayName);
        Assert.Equal("nao-responda@exemplo.com", email.From.Address);
    }

    [Fact]
    public void MontarMensagem_DeveIgnorarNomeRemetenteLegadoDaConfiguracao()
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection(
            [
                new KeyValuePair<string, string?>("Email:Remetente", "nao-responda@exemplo.com"),
                new KeyValuePair<string, string?>("Email:NomeRemetente", "Enlace"),
            ])
            .Build();
        var opcoes = configuracao.GetSection(OpcoesEmail.Secao).Get<OpcoesEmail>()!;
        var service = CriarService(opcoes);

        using var email = service.MontarMensagem(Mensagem);

        Assert.Equal("Nossia", email.From!.DisplayName);
        Assert.DoesNotContain("Enlace", email.From.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void MontarMensagem_DevePreservarAssuntoDestinatarioECorpos()
    {
        var service = CriarService(new OpcoesEmail { Remetente = "nao-responda@exemplo.com" });

        using var email = service.MontarMensagem(Mensagem);

        Assert.Equal(Mensagem.Assunto, email.Subject);
        Assert.Equal(Mensagem.CorpoTexto, email.Body);
        Assert.False(email.IsBodyHtml);
        var destinatario = Assert.Single(email.To);
        Assert.Equal("marina@exemplo.com", destinatario.Address);
        Assert.Equal("Marina", destinatario.DisplayName);
        var alternativa = Assert.Single(email.AlternateViews);
        Assert.Equal("text/html", alternativa.ContentType.MediaType);
    }

    [Fact]
    public void MontarMensagem_ComMensagemNula_DeveLancarArgumentNullException()
    {
        var service = CriarService(new OpcoesEmail { Remetente = "nao-responda@exemplo.com" });

        Assert.Throws<ArgumentNullException>(() => service.MontarMensagem(null!));
    }

    [Fact]
    public void MontarMensagem_ComRemetenteInvalido_DeveFalharAntesDoEnvio()
    {
        var service = CriarService(new OpcoesEmail { Remetente = "remetente-invalido" });

        Assert.Throws<FormatException>(() => service.MontarMensagem(Mensagem));
    }

    private static EnvioEmailSmtpService CriarService(OpcoesEmail opcoes) => new(Options.Create(opcoes));
}
