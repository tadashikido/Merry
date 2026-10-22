using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Casamento.Aplicacao.Casamentos;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Isolamento;
using ClienteAcessoCasal = Casamento.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteChecklist = Casamento.Testes.Integracao.Checklists.ClienteChecklist;
using ClienteConvites = Casamento.Testes.Integracao.Convidados.ClienteConvites;
using ClienteRsvp = Casamento.Testes.Integracao.Rsvp.ClienteRsvp;

namespace Casamento.Testes.Integracao.Casamentos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ProximosPassosApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ProximosPassosApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static string Rota(Guid casamentoId)
    {
        return $"{ClienteCasamentos.Rota}/{casamentoId}/proximos-passos";
    }

    private static async Task<ProximosPassosCasamentoDto> ObterAsync(HttpClient cliente, Guid casamentoId)
    {
        var resposta = await cliente.GetAsync(Rota(casamentoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ProximosPassosCasamentoDto>())!;
    }

    [Fact]
    public async Task CasamentoNovo_DeveRetornarTodosOsPassosPendentesSemCache()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.GetAsync(Rota(casamento.Id));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.False(json.RootElement.GetProperty("casalConvidado").GetBoolean());
        Assert.False(json.RootElement.GetProperty("checklistAplicado").GetBoolean());
        Assert.False(json.RootElement.GetProperty("convidadosCadastrados").GetBoolean());
        Assert.False(json.RootElement.GetProperty("convitesEnviados").GetBoolean());
        Assert.False(json.RootElement.GetProperty("todosConcluidos").GetBoolean());
        Assert.Equal(5, json.RootElement.EnumerateObject().Count());
    }

    [Fact]
    public async Task ConcluindoCadaPasso_DeveRefletirOsDadosReais()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        await ClienteAcessoCasal.ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, ClienteAcessoCasal.EmailCasalUnico());
        var aposConviteCasal = await ObterAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(aposConviteCasal.CasalConvidado);
        Assert.False(aposConviteCasal.ChecklistAplicado);

        var modelo = await ClienteChecklist.CriarModeloComItensAsync(OrganizacaoA.Cliente, [60, 30]);
        await ClienteChecklist.AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);
        var aposChecklist = await ObterAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(aposChecklist.ChecklistAplicado);
        Assert.False(aposChecklist.ConvidadosCadastrados);

        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var aposConvidados = await ObterAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(aposConvidados.ConvidadosCadastrados);
        Assert.False(aposConvidados.ConvitesEnviados);
        Assert.False(aposConvidados.TodosConcluidos);

        await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, casamento.Id, convite.Id);
        var envio = await OrganizacaoA.Cliente.PostAsync(ClienteRsvp.RotaEnvio(casamento.Id, convite.Id), null);
        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        var final = await ObterAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(final.CasalConvidado);
        Assert.True(final.ChecklistAplicado);
        Assert.True(final.ConvidadosCadastrados);
        Assert.True(final.ConvitesEnviados);
        Assert.True(final.TodosConcluidos);
    }

    [Fact]
    public async Task AcessoDoCasalRevogado_NaoDeveContarComoCasalConvidado()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var acesso = await ClienteAcessoCasal.ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, ClienteAcessoCasal.EmailCasalUnico());

        var revogacao = await OrganizacaoA.Cliente.DeleteAsync(ClienteAcessoCasal.Rota(casamento.Id, acesso.Id));
        Assert.Equal(HttpStatusCode.NoContent, revogacao.StatusCode);

        var passos = await ObterAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.False(passos.CasalConvidado);
    }

    [Fact]
    public async Task CasamentoDeOutraOrganizacao_DeveRetornar404SemVazarDados()
    {
        var deA = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, deA.Id);

        var alheio = await OrganizacaoB.Cliente.GetAsync(Rota(deA.Id));
        var inexistente = await OrganizacaoB.Cliente.GetAsync(Rota(Guid.NewGuid()));

        await AssertNaoEncontradoAsync(alheio);
        await AssertNaoEncontradoAsync(inexistente);
        Assert.DoesNotContain("convidadosCadastrados", await alheio.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SemAutenticacao_DeveRetornar401()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await ClienteAnonimo.GetAsync(Rota(casamento.Id));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }
}
