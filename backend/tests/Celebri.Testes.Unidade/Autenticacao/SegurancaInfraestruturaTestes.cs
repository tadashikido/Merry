using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Email;
using Celebri.Infraestrutura;
using Celebri.Infraestrutura.Seguranca;

namespace Celebri.Testes.Unidade.Autenticacao;

public class SegurancaInfraestruturaTestes
{
    [Fact]
    public void GeradorTokenOpaco_DeveGerarValoresUnicosDe256BitsEmBase64Url()
    {
        var gerador = new GeradorTokenOpaco();

        var valores = Enumerable.Range(0, 50).Select(_ => gerador.Gerar()).ToList();

        Assert.Equal(50, valores.Distinct().Count());
        Assert.All(valores, valor =>
        {
            Assert.Equal(43, valor.Length);
            Assert.DoesNotContain('+', valor);
            Assert.DoesNotContain('/', valor);
            Assert.DoesNotContain('=', valor);
        });
    }

    [Fact]
    public void GeradorTokenOpaco_CalcularHash_DeveSerSha256HexDeterministico()
    {
        var gerador = new GeradorTokenOpaco();

        var hash = gerador.CalcularHash("abc");

        Assert.Equal("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", hash);
        Assert.Equal(hash, gerador.CalcularHash("abc"));
    }

    [Fact]
    public void HashSenhaService_DeveUsarFormatoIdentityV3EVerificarCorretamente()
    {
        var servico = new HashSenhaService();

        var hash = servico.GerarHash("senhaForte123");

        Assert.Equal(0x01, Convert.FromBase64String(hash)[0]);
        Assert.NotEqual(hash, servico.GerarHash("senhaForte123"));
        Assert.Equal(ResultadoVerificacaoSenha.Valida, servico.Verificar(hash, "senhaForte123"));
        Assert.Equal(ResultadoVerificacaoSenha.Invalida, servico.Verificar(hash, "senhaErrada123"));
        servico.VerificarFicticio("qualquer");
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("curta", false)]
    [InlineData("0123456789012345678901234567890", false)]
    [InlineData("01234567890123456789012345678901", true)]
    public void OpcoesJwt_ChaveValida_DeveExigir32Bytes(string? chave, bool esperado)
    {
        Assert.Equal(esperado, OpcoesJwt.ChaveValida(chave));
    }

    [Theory]
    [InlineData("https://app.casamento.com.br", true)]
    [InlineData("http://localhost:5173", true)]
    [InlineData("", false)]
    [InlineData("app.casamento.com.br", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("https://app.casamento.com.br/?x=1", false)]
    public void UrlFrontendValida_DeveAceitarSomenteUrlHttpAbsolutaSemQuery(string url, bool esperado)
    {
        Assert.Equal(esperado, ConfiguracaoInfraestrutura.UrlFrontendValida(url));
    }

    [Fact]
    public void ModeloEmailRedefinicao_DeveCodificarHtmlDoNome()
    {
        var mensagem = ModelosEmail.RedefinicaoSenha("<script>Ana</script>", "ana@exemplo.com", "https://app/redefinir-senha#token=abc", 60);

        Assert.DoesNotContain("<script>", mensagem.CorpoHtml);
        Assert.Contains("1 hora", mensagem.CorpoTexto);
        Assert.Equal(ModelosEmail.AssuntoRedefinicaoSenha, mensagem.Assunto);
    }
}
