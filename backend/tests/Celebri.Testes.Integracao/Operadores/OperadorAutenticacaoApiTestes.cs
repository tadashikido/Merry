using System.Net;
using System.Net.Http.Headers;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Operadores;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Microsoft.IdentityModel.JsonWebTokens;
using static Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;
using static Celebri.Testes.Integracao.Operadores.ClienteOperador;

namespace Celebri.Testes.Integracao.Operadores;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class OperadorAutenticacaoApiTestes : IAsyncLifetime
{
    private readonly BancoPostgreSqlFixture _banco;
    private FabricaApiAutenticacao _fabrica = null!;
    private HttpClient _cliente = null!;

    public OperadorAutenticacaoApiTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    public Task InitializeAsync()
    {
        _fabrica = new FabricaApiAutenticacao(_banco.CriarStringConexaoBancoNovo(), ConfiguracaoProvisionamento());
        _cliente = _fabrica.CriarClienteHttps();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _cliente.Dispose();
        await _fabrica.DisposeAsync();
    }

    [Fact]
    public async Task Entrar_CredenciaisCorretas_DeveEmitirCookieProprioETokenSemOrganizacao()
    {
        var resposta = await EntrarAsync(_cliente);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var cookie = LerCabecalhoCookie(resposta);
        Assert.NotNull(cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/operador/autenticacao", cookie, StringComparison.OrdinalIgnoreCase);

        var jwt = new JsonWebToken(await LerTokenAcessoAsync(resposta));
        Assert.Equal(PapeisOperador.Papel, jwt.GetClaim(ClaimsAutenticacao.Papel).Value);
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type == ClaimsAutenticacao.OrganizacaoId);

        var eu = await ObterEuAsync(_cliente, await LerTokenAcessoAsync(resposta));
        Assert.Equal(HttpStatusCode.OK, eu.StatusCode);
        using var json = await LerJsonAsync(eu);
        Assert.Equal(EmailOperador, json.RootElement.GetProperty("email").GetString());
    }

    [Fact]
    public async Task TokenDeOperador_NaoDeveAcessarEndpointDeTenant()
    {
        var token = await LerTokenAcessoAsync(await EntrarAsync(_cliente));

        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/testes/protegido");
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resposta = await _cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task TokenDeTenant_NaoDeveAcessarEuDoOperador()
    {
        var cadastro = await CadastrarAsync(_cliente, EmailUnico());
        var tokenTenant = await LerTokenAcessoAsync(cadastro);

        var resposta = await ObterEuAsync(_cliente, tokenTenant);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Entrar_EmailInexistenteESenhaErrada_DevemRetornar401ComMesmaMensagem()
    {
        var senhaErrada = await EntrarAsync(_cliente, EmailOperador, "senhaErrada123");
        var inexistente = await EntrarAsync(_cliente, "ninguem@celebri.teste", SenhaOperador);

        Assert.Equal(HttpStatusCode.Unauthorized, senhaErrada.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, inexistente.StatusCode);
        using var jsonSenha = await LerJsonAsync(senhaErrada);
        using var jsonInexistente = await LerJsonAsync(inexistente);
        Assert.Equal(MensagensAutenticacao.CredenciaisInvalidas, jsonSenha.RootElement.GetProperty("title").GetString());
        Assert.Equal(
            jsonSenha.RootElement.GetProperty("title").GetString(),
            jsonInexistente.RootElement.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Entrar_AposCincoFalhas_DeveBloquearMesmoComSenhaCorreta()
    {
        for (var tentativa = 0; tentativa < 5; tentativa++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await EntrarAsync(_cliente, EmailOperador, "senhaErrada123")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await EntrarAsync(_cliente)).StatusCode);
    }

    [Fact]
    public async Task Renovar_DeveRotacionarEInvalidarOTokenAnterior()
    {
        var primeiro = LerRefreshToken(await EntrarAsync(_cliente));

        var renovacao = await RenovarAsync(_cliente, primeiro);

        Assert.Equal(HttpStatusCode.OK, renovacao.StatusCode);
        var segundo = LerRefreshToken(renovacao);
        Assert.NotNull(segundo);
        Assert.NotEqual(primeiro, segundo);
        Assert.Equal(HttpStatusCode.OK, (await ObterEuAsync(_cliente, await LerTokenAcessoAsync(renovacao))).StatusCode);
    }

    [Fact]
    public async Task Sair_DeveRevogarORefreshTokenERemoverCookie()
    {
        var refresh = LerRefreshToken(await EntrarAsync(_cliente));

        var saida = await SairAsync(_cliente, refresh);

        Assert.Equal(HttpStatusCode.NoContent, saida.StatusCode);
        Assert.Contains("expires=Thu, 01 Jan 1970", LerCabecalhoCookie(saida), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RenovarAsync(_cliente, refresh)).StatusCode);
    }
}
