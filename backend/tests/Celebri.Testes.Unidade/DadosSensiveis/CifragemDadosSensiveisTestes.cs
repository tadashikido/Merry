using System.Security.Cryptography;
using System.Text;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Dominio.DadosSensiveis;
using Celebri.Infraestrutura.Seguranca;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.DadosSensiveis;

public class CifragemDadosSensiveisTestes
{
    private static readonly string ChaveTeste = Convert.ToBase64String(Enumerable.Range(1, 32).Select(valor => (byte)valor).ToArray());

    private static CifradorDadosSensiveis Cifrador(string? chave = null)
    {
        return new CifradorDadosSensiveis(Options.Create(new OpcoesDadosSensiveis { ChaveCifragem = chave ?? ChaveTeste }));
    }

    [Fact]
    public void Cifrar_DeveTerPrefixoDeVersaoENaoConterTextoClaro()
    {
        var convidado = Guid.NewGuid();

        var cifra = Cifrador().Cifrar("{\"tipos\":[\"SemGluten\"],\"necessidade\":\"cadeira de rodas\"}", convidado);

        Assert.StartsWith(CifradorDadosSensiveis.PrefixoVersao, cifra, StringComparison.Ordinal);
        Assert.DoesNotContain("SemGluten", cifra, StringComparison.Ordinal);
        Assert.DoesNotContain("cadeira", cifra, StringComparison.Ordinal);
        Assert.DoesNotContain(Convert.ToBase64String(Encoding.UTF8.GetBytes("SemGluten")), cifra, StringComparison.Ordinal);
    }

    [Fact]
    public void Cifrar_MesmoTexto_DeveGerarCifrasDiferentesPorNonce()
    {
        var convidado = Guid.NewGuid();
        var cifrador = Cifrador();

        Assert.NotEqual(cifrador.Cifrar("igual", convidado), cifrador.Cifrar("igual", convidado));
    }

    [Fact]
    public void Decifrar_MesmoConvidado_DeveRecuperarTexto()
    {
        var convidado = Guid.NewGuid();
        var cifrador = Cifrador();

        Assert.Equal("vegana", cifrador.Decifrar(cifrador.Cifrar("vegana", convidado), convidado));
    }

    [Fact]
    public void Decifrar_OutroConvidado_DeveFalharPorAad()
    {
        var cifrador = Cifrador();
        var cifra = cifrador.Cifrar("vegana", Guid.NewGuid());

        Assert.Null(cifrador.Decifrar(cifra, Guid.NewGuid()));
    }

    [Fact]
    public void Decifrar_OutraChave_DeveFalhar()
    {
        var convidado = Guid.NewGuid();
        var cifra = Cifrador().Cifrar("vegana", convidado);
        var outraChave = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        Assert.Null(Cifrador(outraChave).Decifrar(cifra, convidado));
    }

    [Theory]
    [InlineData("")]
    [InlineData("sem-prefixo")]
    [InlineData("v1.nao-e-base64!!")]
    [InlineData("v1.AAAA")]
    [InlineData("v2.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public void Decifrar_ConteudoCorrompido_DeveRetornarNulo(string conteudo)
    {
        Assert.Null(Cifrador().Decifrar(conteudo, Guid.NewGuid()));
    }

    [Fact]
    public void Decifrar_CifraAdulterada_DeveRetornarNulo()
    {
        var convidado = Guid.NewGuid();
        var cifra = Cifrador().Cifrar("vegana", convidado).ToCharArray();
        var posicao = cifra.Length - 3;
        cifra[posicao] = cifra[posicao] == 'A' ? 'B' : 'A';

        Assert.Null(Cifrador().Decifrar(new string(cifra), convidado));
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("nao-e-base64", false)]
    [InlineData("YWJjZA==", false)]
    [InlineData("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3OA==", false)]
    [InlineData("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=", true)]
    public void ChaveValida_ExigeExatamente32BytesEmBase64(string? chave, bool valida)
    {
        Assert.Equal(valida, OpcoesDadosSensiveis.ChaveValida(chave));
    }

    [Fact]
    public void Construtor_ChaveInvalida_DeveFalharComOrientacao()
    {
        var excecao = Assert.Throws<InvalidOperationException>(() => Cifrador("curta"));

        Assert.Contains("DadosSensiveis__ChaveCifragem", excecao.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Cifragem_RestricaoCompleta_DeveIrEVoltar()
    {
        var cifragem = new CifragemRestricaoAlimentar(Cifrador());
        var convidado = Guid.NewGuid();
        var restricao = RestricaoAlimentar.Criar([TipoRestricaoAlimentar.Vegana, TipoRestricaoAlimentar.AlergiaFrutosDoMar], "sem porco", "cadeira de rodas")!;

        var lida = cifragem.Ler(cifragem.Cifrar(restricao, convidado), convidado)!;

        Assert.Equal(restricao.Tipos, lida.Tipos);
        Assert.Equal("sem porco", lida.OutraRestricao);
        Assert.Equal("cadeira de rodas", lida.NecessidadeEspecial);
    }

    [Theory]
    [InlineData("nao e json")]
    [InlineData("{\"Tipos\":[\"Inexistente\"]}")]
    [InlineData("null")]
    public void Desserializar_ConteudoInvalido_DeveRetornarNulo(string json)
    {
        Assert.Null(CifragemRestricaoAlimentar.Desserializar(json));
    }

    [Fact]
    public void CifradorTokenRsvp_AposRefatoracao_ContinuaCompativel()
    {
        var cifrador = new CifradorTokenRsvp(Options.Create(new OpcoesJwt { ChaveAssinatura = "chave-de-assinatura-exclusiva-dos-testes-de-unidade" }));
        var convite = Guid.NewGuid();

        Assert.Equal("token-original", cifrador.Decifrar(cifrador.Cifrar("token-original", convite), convite));
        Assert.Null(cifrador.Decifrar(cifrador.Cifrar("token-original", convite), Guid.NewGuid()));
    }
}
