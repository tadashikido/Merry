using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Casamento.Aplicacao.Sistema;
using Casamento.Testes.Integracao.Infraestrutura;

namespace Casamento.Testes.Integracao.Api;

public class PipelineApiTestes : IClassFixture<FabricaApiSemBanco>
{
    private readonly FabricaApiSemBanco _fabrica;

    public PipelineApiTestes(FabricaApiSemBanco fabrica)
    {
        _fabrica = fabrica;
    }

    [Fact]
    public async Task ObterInformacoes_DeveRetornar200ComNomeEVersao()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/sistema/informacoes");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Equal("application/json", resposta.Content.Headers.ContentType?.MediaType);
        var informacoes = await resposta.Content.ReadFromJsonAsync<InformacoesSistemaDto>();
        Assert.NotNull(informacoes);
        Assert.Equal("Celebri", informacoes.Nome);
        Assert.False(string.IsNullOrWhiteSpace(informacoes.Versao));
    }

    [Fact]
    public async Task ObterInformacoes_DeveSerializarEmCamelCase()
    {
        using var cliente = _fabrica.CreateClient();

        var json = await cliente.GetStringAsync("/api/sistema/informacoes");

        using var documento = JsonDocument.Parse(json);
        Assert.True(documento.RootElement.TryGetProperty("nome", out _));
        Assert.True(documento.RootElement.TryGetProperty("versao", out _));
    }

    [Theory]
    [InlineData("/api/sistema/informacoes")]
    [InlineData("/api/rota-inexistente")]
    [InlineData("/api/testes/erros/inesperado")]
    public async Task TodaResposta_DeveConterCabecalhosDeSeguranca(string rota)
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync(rota);

        Assert.Equal("nosniff", resposta.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", resposta.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("no-referrer", resposta.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("frame-ancestors 'none'", resposta.Headers.GetValues("Content-Security-Policy").Single());
        Assert.False(resposta.Headers.Contains("Server"));
    }

    [Fact]
    public async Task RotaInexistente_DeveRetornar404EmProblemDetails()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/rota-inexistente");

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        Assert.Equal("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal(404, documento.RootElement.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(documento.RootElement.GetProperty("traceId").GetString()));
    }

    [Fact]
    public async Task ErroInesperado_DeveRetornar500SemVazarDetalhesInternos()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/testes/erros/inesperado");

        Assert.Equal(HttpStatusCode.InternalServerError, resposta.StatusCode);
        Assert.Equal("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain(ErrosTestesController.MensagemSensivel, corpo);
        Assert.DoesNotContain("InvalidOperationException", corpo);
        Assert.DoesNotContain("   at ", corpo);
        using var documento = JsonDocument.Parse(corpo);
        Assert.Equal("Ocorreu um erro inesperado.", documento.RootElement.GetProperty("title").GetString());
        Assert.False(documento.RootElement.TryGetProperty("detail", out _));
        Assert.False(string.IsNullOrWhiteSpace(documento.RootElement.GetProperty("traceId").GetString()));
    }

    [Fact]
    public async Task RegraNegocioViolada_DeveRetornar422ComMensagemDaRegra()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/testes/erros/regra-negocio");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal("A confirmação de presença já foi encerrada.", documento.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task RequisicaoInvalidaDoCliente_DevePreservarStatusEmProblemDetails()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/testes/erros/requisicao-invalida");

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, resposta.StatusCode);
        Assert.Equal("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal("A requisição é inválida.", documento.RootElement.GetProperty("title").GetString());
        Assert.False(documento.RootElement.TryGetProperty("detail", out _));
    }

    [Fact]
    public async Task HostNaoPermitido_DeveSerRejeitadoForaDeDevelopment()
    {
        using var cliente = _fabrica.CreateClient();
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/sistema/informacoes");
        requisicao.Headers.Host = "dominio-malicioso.exemplo";

        var resposta = await cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task RecursoNaoEncontrado_DeveRetornar404ComMensagem()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/testes/erros/nao-encontrado");

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal("Convidado não encontrado.", documento.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Cors_OrigemPermitida_DeveReceberCabecalhoDeOrigem()
    {
        using var cliente = _fabrica.CreateClient();
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/sistema/informacoes");
        requisicao.Headers.Add("Origin", FabricaApi.OrigemPermitida);

        var resposta = await cliente.SendAsync(requisicao);

        Assert.Equal(FabricaApi.OrigemPermitida, resposta.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Equal("true", resposta.Headers.GetValues("Access-Control-Allow-Credentials").Single());
    }

    [Theory]
    [InlineData("https://site-malicioso.exemplo")]
    [InlineData("null")]
    [InlineData("https://app.casamento.teste.exemplo")]
    public async Task Cors_OrigemNaoPermitida_NaoDeveReceberCabecalhoDeOrigem(string origem)
    {
        using var cliente = _fabrica.CreateClient();
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/sistema/informacoes");
        requisicao.Headers.Add("Origin", origem);

        var resposta = await cliente.SendAsync(requisicao);

        Assert.False(resposta.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Cors_PreflightDeOrigemPermitida_DeveAutorizarMetodo()
    {
        using var cliente = _fabrica.CreateClient();
        using var requisicao = new HttpRequestMessage(HttpMethod.Options, "/api/sistema/informacoes");
        requisicao.Headers.Add("Origin", FabricaApi.OrigemPermitida);
        requisicao.Headers.Add("Access-Control-Request-Method", "POST");
        requisicao.Headers.Add("Access-Control-Request-Headers", "content-type");

        var resposta = await cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal(FabricaApi.OrigemPermitida, resposta.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Contains("POST", resposta.Headers.GetValues("Access-Control-Allow-Methods").Single());
    }

    [Fact]
    public async Task Saude_ComBancoIndisponivel_DeveRetornar503Unhealthy()
    {
        using var cliente = _fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/saude");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, resposta.StatusCode);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal("Unhealthy", documento.RootElement.GetProperty("status").GetString());
    }
}
