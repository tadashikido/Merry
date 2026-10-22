using System.Net;
using Casamento.Infraestrutura.Seguranca;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Infraestrutura;
using static Casamento.Testes.Integracao.Autenticacao.ClienteAutenticacao;

namespace Casamento.Testes.Integracao.Autenticacao;

[Collection(ColecaoBancoPostgreSql.Nome)]
public class ConfiguracaoAutenticacaoTestes
{
    private readonly BancoPostgreSqlFixture _banco;

    public ConfiguracaoAutenticacaoTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Entrar_AcimaDoLimitePorIp_DeveRetornar429ComRetryAfter()
    {
        await using var fabrica = new FabricaApiAutenticacao(
            _banco.CriarStringConexaoBancoNovo(),
            new Dictionary<string, string?> { ["LimitesRequisicao:entrar:Limite"] = "2" });
        using var cliente = fabrica.CriarClienteHttps();
        var email = EmailUnico();

        await EntrarAsync(cliente, email);
        await EntrarAsync(cliente, email);
        var bloqueada = await EntrarAsync(cliente, email);

        Assert.Equal(HttpStatusCode.TooManyRequests, bloqueada.StatusCode);
        Assert.True(bloqueada.Headers.Contains("Retry-After"));
        Assert.Equal("application/problem+json", bloqueada.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task EsqueciSenha_AcimaDoLimitePorIp_DeveRetornar429()
    {
        await using var fabrica = new FabricaApiAutenticacao(
            _banco.CriarStringConexaoBancoNovo(),
            new Dictionary<string, string?> { ["LimitesRequisicao:recuperacao:Limite"] = "1" });
        using var cliente = fabrica.CriarClienteHttps();

        await cliente.PostAsync("/api/autenticacao/esqueci-senha", System.Net.Http.Json.JsonContent.Create(new { email = EmailUnico() }));
        var bloqueada = await cliente.PostAsync("/api/autenticacao/esqueci-senha", System.Net.Http.Json.JsonContent.Create(new { email = EmailUnico() }));

        Assert.Equal(HttpStatusCode.TooManyRequests, bloqueada.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("curta-demais")]
    public void SemChaveJwtValida_AplicacaoNaoDeveIniciar(string chave)
    {
        using var fabrica = new FabricaApi(
            FabricaApi.StringConexaoInalcancavel,
            configuracoesAdicionais: new Dictionary<string, string?> { ["Jwt:ChaveAssinatura"] = chave });

        var excecao = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());

        Assert.Contains("Jwt__ChaveAssinatura", excecao.ToString());
        Assert.Contains(OpcoesJwt.MensagemChaveInvalida, excecao.ToString());
    }

    [Fact]
    public void SemUrlDoFrontend_AplicacaoNaoDeveIniciar()
    {
        using var fabrica = new FabricaApi(
            FabricaApi.StringConexaoInalcancavel,
            configuracoesAdicionais: new Dictionary<string, string?> { ["Autenticacao:UrlFrontend"] = "" });

        var excecao = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());

        Assert.Contains("Autenticacao__UrlFrontend", excecao.ToString());
    }

    [Fact]
    public async Task RotaInexistente_ContinuaRetornando404ParaAnonimo()
    {
        await using var fabrica = new FabricaApiSemBanco();
        using var cliente = fabrica.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync("/api/nao-existe")).StatusCode);
    }
}
