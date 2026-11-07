using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Testes.Integracao.Autenticacao;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Celebri.Testes.Integracao.Operadores;

namespace Celebri.Testes.Integracao.Impersonacao;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ImpersonacaoApiTestes : IAsyncLifetime
{
    private readonly BancoPostgreSqlFixture _banco;
    private FabricaApiAutenticacao _fabrica = null!;
    private HttpClient _cliente = null!;

    public ImpersonacaoApiTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    public Task InitializeAsync()
    {
        _fabrica = new FabricaApiAutenticacao(_banco.CriarStringConexaoBancoNovo(), ClienteOperador.ConfiguracaoProvisionamento());
        _cliente = _fabrica.CriarClienteHttps();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _cliente.Dispose();
        await _fabrica.DisposeAsync();
    }

    [Fact]
    public async Task Iniciar_DeveEmitirTokenQueOperaComoAssessoria()
    {
        var organizacaoId = await CadastrarAssessoriaAsync();
        var tokenOperador = await TokenOperadorAsync();

        using var inicio = await IniciarAsync(tokenOperador, organizacaoId, "investigar chamado 1");
        Assert.Equal(HttpStatusCode.OK, inicio.StatusCode);
        using var jsonInicio = await LerJsonAsync(inicio);
        var tokenImpersonacao = jsonInicio.RootElement.GetProperty("tokenAcesso").GetString()!;

        var eu = await GetComTokenAsync("/api/autenticacao/eu", tokenImpersonacao);

        Assert.Equal(HttpStatusCode.OK, eu.StatusCode);
        using var jsonEu = await LerJsonAsync(eu);
        Assert.Equal("Ana Souza", jsonEu.RootElement.GetProperty("nome").GetString());
    }

    [Fact]
    public async Task Impersonacao_DeveBloquearEscrita()
    {
        var organizacaoId = await CadastrarAssessoriaAsync();
        var tokenOperador = await TokenOperadorAsync();
        using var inicio = await IniciarAsync(tokenOperador, organizacaoId, "investigar");
        using var jsonInicio = await LerJsonAsync(inicio);
        var tokenImpersonacao = jsonInicio.RootElement.GetProperty("tokenAcesso").GetString()!;

        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "/api/eventos")
        {
            Content = JsonContent.Create(new { }),
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenImpersonacao);
        var escrita = await _cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.Forbidden, escrita.StatusCode);
    }

    [Fact]
    public async Task Encerrar_DeveInvalidarOAcesso()
    {
        var organizacaoId = await CadastrarAssessoriaAsync();
        var tokenOperador = await TokenOperadorAsync();
        using var inicio = await IniciarAsync(tokenOperador, organizacaoId, "investigar");
        using var jsonInicio = await LerJsonAsync(inicio);
        var sessaoId = jsonInicio.RootElement.GetProperty("sessaoId").GetString();
        var tokenImpersonacao = jsonInicio.RootElement.GetProperty("tokenAcesso").GetString()!;

        var encerrar = await PostComTokenAsync($"/api/operador/impersonacoes/{sessaoId}/encerrar", tokenOperador);
        Assert.Equal(HttpStatusCode.NoContent, encerrar.StatusCode);

        var euAposEncerrar = await GetComTokenAsync("/api/autenticacao/eu", tokenImpersonacao);
        Assert.Equal(HttpStatusCode.Unauthorized, euAposEncerrar.StatusCode);
    }

    [Fact]
    public async Task TokenDeTenant_NaoDeveIniciarImpersonacao()
    {
        var cadastro = await ClienteAutenticacao.CadastrarAsync(_cliente, ClienteAutenticacao.EmailUnico());
        var tokenTenant = await ClienteOperador.LerTokenAcessoAsync(cadastro);
        using var jsonCadastro = await LerJsonAsync(cadastro);
        var organizacaoId = jsonCadastro.RootElement.GetProperty("usuario").GetProperty("organizacao").GetProperty("id").GetString()!;

        using var resposta = await IniciarAsync(tokenTenant, organizacaoId, "tentativa");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Iniciar_MotivoVazio_DeveRecusar()
    {
        var organizacaoId = await CadastrarAssessoriaAsync();
        var tokenOperador = await TokenOperadorAsync();

        using var resposta = await IniciarAsync(tokenOperador, organizacaoId, string.Empty);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    private async Task<string> CadastrarAssessoriaAsync()
    {
        var cadastro = await ClienteAutenticacao.CadastrarAsync(_cliente, ClienteAutenticacao.EmailUnico());
        using var json = await LerJsonAsync(cadastro);
        return json.RootElement.GetProperty("usuario").GetProperty("organizacao").GetProperty("id").GetString()!;
    }

    private async Task<string> TokenOperadorAsync()
    {
        return await ClienteOperador.LerTokenAcessoAsync(await ClienteOperador.EntrarAsync(_cliente));
    }

    private Task<HttpResponseMessage> IniciarAsync(string token, string organizacaoId, string motivo)
    {
        var requisicao = new HttpRequestMessage(HttpMethod.Post, "/api/operador/impersonacoes")
        {
            Content = JsonContent.Create(new { organizacaoId, motivo }),
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return _cliente.SendAsync(requisicao);
    }

    private Task<HttpResponseMessage> GetComTokenAsync(string rota, string token)
    {
        var requisicao = new HttpRequestMessage(HttpMethod.Get, rota);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return _cliente.SendAsync(requisicao);
    }

    private Task<HttpResponseMessage> PostComTokenAsync(string rota, string token)
    {
        var requisicao = new HttpRequestMessage(HttpMethod.Post, rota);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return _cliente.SendAsync(requisicao);
    }

    private static async Task<JsonDocument> LerJsonAsync(HttpResponseMessage resposta)
    {
        return JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
    }
}
