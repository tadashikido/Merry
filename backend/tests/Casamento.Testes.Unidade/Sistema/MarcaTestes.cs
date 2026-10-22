using Casamento.Aplicacao.Email;
using Casamento.Aplicacao.Sistema;

namespace Casamento.Testes.Unidade.Sistema;

public class MarcaTestes
{
    private const string MarcaLegada = "Enlace";

    [Fact]
    public void Nome_DeveSerCelebri()
    {
        Assert.Equal("Celebri", Marca.Nome);
    }

    [Fact]
    public void InformacoesSistema_DeveUsarNomeDaMarca()
    {
        var informacoes = new InformacoesSistemaService(null).Obter();

        Assert.Equal(Marca.Nome, informacoes.Nome);
    }

    [Fact]
    public void AssuntoRedefinicaoSenha_DeveTerMarcaCelebri()
    {
        Assert.Equal("Redefinição de senha — Celebri", ModelosEmail.AssuntoRedefinicaoSenha);
        Assert.DoesNotContain(MarcaLegada, ModelosEmail.AssuntoRedefinicaoSenha, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RedefinicaoSenha_NaoDeveConterMarcaLegadaEmNenhumCampo()
    {
        var mensagem = ModelosEmail.RedefinicaoSenha("Ana", "ana@exemplo.com", "https://app/redefinir-senha#token=abc", 60);

        AssertSemMarcaLegada(mensagem);
        Assert.Contains(Marca.Nome, mensagem.Assunto);
    }

    [Fact]
    public void ConviteAcessoCasal_NaoDeveConterMarcaLegadaEmNenhumCampo()
    {
        var mensagem = ModelosEmail.ConviteAcessoCasal(
            "Marina",
            "marina@exemplo.com",
            "https://app/aceitar-convite#token=abc",
            "Marina & Pedro",
            "Cerimonial Flor",
            7);

        AssertSemMarcaLegada(mensagem);
        Assert.Equal("Convite para acompanhar o casamento de Marina & Pedro", mensagem.Assunto);
    }

    private static void AssertSemMarcaLegada(MensagemEmail mensagem)
    {
        Assert.DoesNotContain(MarcaLegada, mensagem.Assunto, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(MarcaLegada, mensagem.CorpoTexto, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(MarcaLegada, mensagem.CorpoHtml, StringComparison.OrdinalIgnoreCase);
    }
}
