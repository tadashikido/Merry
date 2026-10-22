using System.Net;
using System.Text.Json;
using Celebri.Testes.Integracao.Infraestrutura;
using Microsoft.Extensions.Hosting;

namespace Celebri.Testes.Integracao.Api;

public class AmbientesApiTestes
{
    [Fact]
    public async Task ErroInesperadoEmDevelopment_DeveIncluirDetalheParaDiagnostico()
    {
        await using var fabrica = new FabricaApi(FabricaApi.StringConexaoInalcancavel, Environments.Development);
        using var cliente = fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/testes/erros/inesperado");

        Assert.Equal(HttpStatusCode.InternalServerError, resposta.StatusCode);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Contains(ErrosTestesController.MensagemSensivel, documento.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public void SemStringDeConexao_AplicacaoNaoDeveIniciar()
    {
        using var fabrica = new FabricaApi(string.Empty);

        var excecao = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());

        var mensagens = string.Join(" | ", EnumerarMensagens(excecao));
        Assert.Contains("ConnectionStrings__Principal", mensagens);
    }

    [Fact]
    public async Task SemOrigensConfiguradas_NenhumaOrigemExternaDeveSerAceita()
    {
        await using var fabrica = new FabricaApi(
            FabricaApi.StringConexaoInalcancavel,
            configuracoesAdicionais: new Dictionary<string, string?> { ["Cors:OrigensPermitidas:0"] = "*" });
        using var cliente = fabrica.CreateClient();
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/sistema/informacoes");
        requisicao.Headers.Add("Origin", "https://qualquer.exemplo");

        var resposta = await cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.False(resposta.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private static IEnumerable<string> EnumerarMensagens(Exception excecao)
    {
        for (Exception? atual = excecao; atual is not null; atual = atual.InnerException)
        {
            yield return atual.Message;
        }
    }
}
