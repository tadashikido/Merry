using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Eventos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteChecklist = Celebri.Testes.Integracao.Checklists.ClienteChecklist;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteRsvp = Celebri.Testes.Integracao.Rsvp.ClienteRsvp;

namespace Celebri.Testes.Integracao.Eventos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ProximosPassosApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ProximosPassosApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static string Rota(Guid eventoId)
    {
        return $"{ClienteEventos.Rota}/{eventoId}/proximos-passos";
    }

    private static async Task<ProximosPassosEventoDto> ObterAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(Rota(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ProximosPassosEventoDto>())!;
    }

    [Fact]
    public async Task EventoNovo_DeveRetornarTodosOsPassosPendentesSemCache()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.GetAsync(Rota(evento.Id));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.False(json.RootElement.GetProperty("anfitriaoConvidado").GetBoolean());
        Assert.False(json.RootElement.GetProperty("checklistAplicado").GetBoolean());
        Assert.False(json.RootElement.GetProperty("convidadosCadastrados").GetBoolean());
        Assert.False(json.RootElement.GetProperty("convitesEnviados").GetBoolean());
        Assert.False(json.RootElement.GetProperty("todosConcluidos").GetBoolean());
        Assert.Equal(5, json.RootElement.EnumerateObject().Count());
    }

    [Fact]
    public async Task ConcluindoCadaPasso_DeveRefletirOsDadosReais()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, ClienteAcessoAnfitriao.EmailAnfitriaoUnico());
        var aposConviteAnfitriao = await ObterAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(aposConviteAnfitriao.AnfitriaoConvidado);
        Assert.False(aposConviteAnfitriao.ChecklistAplicado);

        var modelo = await ClienteChecklist.CriarModeloComItensAsync(OrganizacaoA.Cliente, [60, 30]);
        await ClienteChecklist.AplicarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, modelo.Id);
        var aposChecklist = await ObterAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(aposChecklist.ChecklistAplicado);
        Assert.False(aposChecklist.ConvidadosCadastrados);

        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        var aposConvidados = await ObterAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(aposConvidados.ConvidadosCadastrados);
        Assert.False(aposConvidados.ConvitesEnviados);
        Assert.False(aposConvidados.TodosConcluidos);

        await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, evento.Id, convite.Id);
        var envio = await OrganizacaoA.Cliente.PostAsync(ClienteRsvp.RotaEnvio(evento.Id, convite.Id), null);
        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        var final = await ObterAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(final.AnfitriaoConvidado);
        Assert.True(final.ChecklistAplicado);
        Assert.True(final.ConvidadosCadastrados);
        Assert.True(final.ConvitesEnviados);
        Assert.True(final.TodosConcluidos);
    }

    [Fact]
    public async Task AcessoDoAnfitriaoRevogado_NaoDeveContarComoAnfitriaoConvidado()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var acesso = await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, ClienteAcessoAnfitriao.EmailAnfitriaoUnico());

        var revogacao = await OrganizacaoA.Cliente.DeleteAsync(ClienteAcessoAnfitriao.Rota(evento.Id, acesso.Id));
        Assert.Equal(HttpStatusCode.NoContent, revogacao.StatusCode);

        var passos = await ObterAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.False(passos.AnfitriaoConvidado);
    }

    [Fact]
    public async Task EventoDeOutraOrganizacao_DeveRetornar404SemVazarDados()
    {
        var deA = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await ClienteAnonimo.GetAsync(Rota(evento.Id));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }
}
