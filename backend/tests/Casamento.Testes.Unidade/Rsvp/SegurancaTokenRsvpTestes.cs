using System.Text;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.Rsvp;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Infraestrutura.Seguranca;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace Casamento.Testes.Unidade.Rsvp;

public class SegurancaTokenRsvpTestes
{
    private static CifradorTokenRsvp Cifrador(string chave = "chave-de-assinatura-exclusiva-dos-testes-de-unidade")
    {
        return new CifradorTokenRsvp(Options.Create(new OpcoesJwt { ChaveAssinatura = chave }));
    }

    [Fact]
    public void GeradorToken_DeveProduzir256BitsBase64UrlNoFormatoAceito()
    {
        var gerador = new GeradorTokenOpaco();

        var tokens = Enumerable.Range(0, 200).Select(_ => gerador.Gerar()).ToList();

        Assert.All(tokens, token => Assert.True(FormatoTokenRsvp.Valido(token)));
        Assert.All(tokens, token => Assert.Equal(32, WebEncoders.Base64UrlDecode(token).Length));
        Assert.Equal(tokens.Count, tokens.Distinct(StringComparer.Ordinal).Count());
    }

    [Fact]
    public void Hash_DeveSerSha256HexDe64CaracteresSemConterOToken()
    {
        var gerador = new GeradorTokenOpaco();
        var token = gerador.Gerar();

        var hash = gerador.CalcularHash(token);

        Assert.Equal(64, hash.Length);
        Assert.DoesNotContain(token, hash, StringComparison.Ordinal);
        Assert.Equal(hash, gerador.CalcularHash(token));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("curto")]
    [InlineData("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd")]
    [InlineData("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcdef")]
    [InlineData("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc/e")]
    [InlineData("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc'e")]
    [InlineData("ÁbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde")]
    public void FormatoToken_ForaDoPadrao_DeveSerInvalido(string? token)
    {
        Assert.False(FormatoTokenRsvp.Valido(token));
    }

    [Fact]
    public void Cifrador_IdaEVolta_DeveRecuperarOToken()
    {
        var cifrador = Cifrador();
        var conviteId = Guid.NewGuid();
        var token = new GeradorTokenOpaco().Gerar();

        var cifrado = cifrador.Cifrar(token, conviteId);

        Assert.DoesNotContain(token, cifrado, StringComparison.Ordinal);
        Assert.Equal(token, cifrador.Decifrar(cifrado, conviteId));
    }

    [Fact]
    public void Cifrador_MesmoTokenDuasVezes_DeveGerarCifrasDiferentes()
    {
        var cifrador = Cifrador();
        var conviteId = Guid.NewGuid();

        Assert.NotEqual(cifrador.Cifrar("token", conviteId), cifrador.Cifrar("token", conviteId));
    }

    [Fact]
    public void Cifrador_CifraDeOutroConvite_NaoDeveDecifrar()
    {
        var cifrador = Cifrador();
        var cifrado = cifrador.Cifrar("token", Guid.NewGuid());

        Assert.Null(cifrador.Decifrar(cifrado, Guid.NewGuid()));
    }

    [Fact]
    public void Cifrador_ChaveDiferente_NaoDeveDecifrar()
    {
        var conviteId = Guid.NewGuid();
        var cifrado = Cifrador().Cifrar("token", conviteId);

        Assert.Null(Cifrador("outra-chave-de-assinatura-com-mais-de-32-bytes").Decifrar(cifrado, conviteId));
    }

    [Fact]
    public void Cifrador_CifraAdulterada_NaoDeveDecifrar()
    {
        var cifrador = Cifrador();
        var conviteId = Guid.NewGuid();
        var bytes = WebEncoders.Base64UrlDecode(cifrador.Cifrar("token", conviteId));
        bytes[^1] ^= 0x01;

        Assert.Null(cifrador.Decifrar(WebEncoders.Base64UrlEncode(bytes), conviteId));
    }

    [Theory]
    [InlineData("!!!")]
    [InlineData("")]
    [InlineData("AAAA")]
    public void Cifrador_EntradaInvalida_DeveRetornarNulo(string cifrado)
    {
        Assert.Null(Cifrador().Decifrar(cifrado, Guid.NewGuid()));
    }

    [Fact]
    public void Cifrador_ChaveDerivada_NaoDeveSerAChaveJwt()
    {
        var chave = "chave-de-assinatura-exclusiva-dos-testes-de-unidade";
        var cifrado = Cifrador(chave).Cifrar("token", Guid.Empty);

        Assert.DoesNotContain(Convert.ToBase64String(Encoding.UTF8.GetBytes(chave)), cifrado, StringComparison.Ordinal);
    }

    [Fact]
    public void EscopoRsvp_DeveSerEstabelecidoUmaUnicaVez()
    {
        var escopo = new EscopoIsolamentoRsvp();
        var organizacao = Guid.NewGuid();
        var convite = Guid.NewGuid();

        escopo.Estabelecer(organizacao, convite);

        Assert.Equal(organizacao, escopo.OrganizacaoId);
        Assert.Equal(convite, escopo.ConviteId);
        Assert.Throws<InvalidOperationException>(() => escopo.Estabelecer(Guid.NewGuid(), Guid.NewGuid()));
        Assert.Throws<InvalidOperationException>(() => escopo.Estabelecer(organizacao, convite));
        Assert.Equal(organizacao, escopo.OrganizacaoId);
    }

    [Fact]
    public void EscopoRsvp_IdentificadoresVazios_DeveRecusar()
    {
        var escopo = new EscopoIsolamentoRsvp();

        Assert.Throws<InvalidOperationException>(() => escopo.Estabelecer(Guid.Empty, Guid.NewGuid()));
        Assert.Throws<InvalidOperationException>(() => escopo.Estabelecer(Guid.NewGuid(), Guid.Empty));
        Assert.Null(escopo.OrganizacaoId);
    }

    [Fact]
    public void ContextoRequisicao_SemEscopo_DeveUsarOrganizacaoDoUsuario()
    {
        var organizacaoUsuario = Guid.NewGuid();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(new UsuarioFixo(true, organizacaoUsuario)),
            new EscopoIsolamentoRsvp(),
            new EscopoIsolamentoAcessoCasal(),
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());

        Assert.Equal(organizacaoUsuario, contexto.OrganizacaoId);
    }

    [Fact]
    public void ContextoRequisicao_AnonimoSemEscopo_DeveSerFailClosed()
    {
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(new UsuarioFixo(false, null)),
            new EscopoIsolamentoRsvp(),
            new EscopoIsolamentoAcessoCasal(),
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());

        Assert.Null(contexto.OrganizacaoId);
    }

    [Fact]
    public void ContextoRequisicao_ComEscopoEstabelecido_DevePrevalecerSobreOUsuario()
    {
        var escopo = new EscopoIsolamentoRsvp();
        var organizacaoDoConvite = Guid.NewGuid();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(new UsuarioFixo(true, Guid.NewGuid())),
            escopo,
            new EscopoIsolamentoAcessoCasal(),
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());

        escopo.Estabelecer(organizacaoDoConvite, Guid.NewGuid());

        Assert.Equal(organizacaoDoConvite, contexto.OrganizacaoId);
    }

    private sealed class UsuarioFixo : IUsuarioAtual
    {
        public UsuarioFixo(bool autenticado, Guid? organizacaoId)
        {
            Autenticado = autenticado;
            OrganizacaoId = organizacaoId;
        }

        public bool Autenticado { get; }

        public Guid? UsuarioId => Autenticado ? Guid.NewGuid() : null;

        public Guid? OrganizacaoId { get; }

        public Guid? CasamentoId => null;

        public string? Papel => Autenticado ? "Dono" : null;
    }
}
