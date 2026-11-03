using System.Net;
using System.Net.Http.Headers;
using Celebri.Testes.Integracao.Autenticacao;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Celebri.Testes.Integracao.Operadores;

namespace Celebri.Testes.Integracao.Operacao;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class OperacaoAssessoriasApiTestes : IAsyncLifetime
{
    private readonly BancoPostgreSqlFixture _banco;
    private FabricaApiAutenticacao _fabrica = null!;
    private HttpClient _cliente = null!;

    public OperacaoAssessoriasApiTestes(BancoPostgreSqlFixture banco)
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
    public async Task Listar_DeveIncluirAssessoriaCadastrada()
    {
        await ClienteAutenticacao.CadastrarAsync(_cliente, ClienteAutenticacao.EmailUnico());
        var token = await TokenOperadorAsync();

        var resposta = await GetOperadorAsync("/api/operador/assessorias", token);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        using var json = await ClienteOperador.LerJsonAsync(resposta);
        Assert.True(json.RootElement.GetArrayLength() >= 1);
    }

    [Fact]
    public async Task TokenDeTenant_NaoDeveAcessarConsole()
    {
        var cadastro = await ClienteAutenticacao.CadastrarAsync(_cliente, ClienteAutenticacao.EmailUnico());
        var tokenTenant = await ClienteOperador.LerTokenAcessoAsync(cadastro);

        var resposta = await GetOperadorAsync("/api/operador/assessorias", tokenTenant);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Suspender_DeveBloquearLogin_Reativar_DeveRestaurar()
    {
        var email = ClienteAutenticacao.EmailUnico();
        var cadastro = await ClienteAutenticacao.CadastrarAsync(_cliente, email);
        using var jsonCadastro = await ClienteOperador.LerJsonAsync(cadastro);
        var organizacaoId = jsonCadastro.RootElement.GetProperty("usuario").GetProperty("organizacao").GetProperty("id").GetString();
        var token = await TokenOperadorAsync();

        var suspensao = await PostOperadorAsync($"/api/operador/assessorias/{organizacaoId}/suspender", token);
        Assert.Equal(HttpStatusCode.NoContent, suspensao.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAutenticacao.EntrarAsync(_cliente, email)).StatusCode);

        var reativacao = await PostOperadorAsync($"/api/operador/assessorias/{organizacaoId}/reativar", token);
        Assert.Equal(HttpStatusCode.NoContent, reativacao.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ClienteAutenticacao.EntrarAsync(_cliente, email)).StatusCode);
    }

    [Fact]
    public async Task Dashboard_DeveRetornarContadores()
    {
        await ClienteAutenticacao.CadastrarAsync(_cliente, ClienteAutenticacao.EmailUnico());
        var token = await TokenOperadorAsync();

        var resposta = await GetOperadorAsync("/api/operador/dashboard", token);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        using var json = await ClienteOperador.LerJsonAsync(resposta);
        Assert.True(json.RootElement.GetProperty("totalAssessorias").GetInt32() >= 1);
    }

    private async Task<string> TokenOperadorAsync()
    {
        return await ClienteOperador.LerTokenAcessoAsync(await ClienteOperador.EntrarAsync(_cliente));
    }

    private Task<HttpResponseMessage> GetOperadorAsync(string rota, string token)
    {
        var requisicao = new HttpRequestMessage(HttpMethod.Get, rota);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return _cliente.SendAsync(requisicao);
    }

    private Task<HttpResponseMessage> PostOperadorAsync(string rota, string token)
    {
        var requisicao = new HttpRequestMessage(HttpMethod.Post, rota);
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return _cliente.SendAsync(requisicao);
    }
}
