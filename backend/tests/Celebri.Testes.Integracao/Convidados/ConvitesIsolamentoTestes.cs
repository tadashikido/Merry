using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Convidados;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Convidados;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ConvitesIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public ConvitesIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    protected override bool IncluirEntidadeTeste => false;

    private async Task<(Guid EventoId, ConviteDto Convite)> CriarDeAAsync()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await CriarAsync(OrganizacaoA.Cliente, evento.Id);
        return (evento.Id, convite);
    }

    private async Task AssertConviteDeAIntactoAsync(Guid eventoId, ConviteDto original)
    {
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(eventoId, original.Id));
        Assert.Equal(original.Nome, atual!.Nome);
        Assert.Equal(original.Convidados.Select(convidado => convidado.Nome), atual.Convidados.Select(convidado => convidado.Nome));
    }

    [Fact]
    public async Task Listar_ConvitesDeEventoDeOutraOrganizacao_DeveRetornar404SemDados()
    {
        var (eventoId, _) = await CriarDeAAsync();

        var resposta = await OrganizacaoB.Cliente.GetAsync(Rota(eventoId));

        await AssertNaoEncontradoAsync(resposta);
        Assert.DoesNotContain("Souza", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync($"{Rota(eventoId)}/totais"));
    }

    [Fact]
    public async Task Obter_ConviteDeOutraOrganizacao_DeveSerIndistinguivelDeInexistente()
    {
        var (eventoId, convite) = await CriarDeAAsync();

        var alheio = await OrganizacaoB.Cliente.GetAsync(Rota(eventoId, convite.Id));
        var inexistente = await OrganizacaoB.Cliente.GetAsync(Rota(Guid.NewGuid(), Guid.NewGuid()));

        await AssertNaoEncontradoAsync(alheio);
        Assert.Equal(inexistente.StatusCode, alheio.StatusCode);
        using var jsonAlheio = JsonDocument.Parse(await alheio.Content.ReadAsStringAsync());
        using var jsonInexistente = JsonDocument.Parse(await inexistente.Content.ReadAsStringAsync());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("title").GetString(), jsonAlheio.RootElement.GetProperty("title").GetString());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("detail").GetString(), jsonAlheio.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Criar_EmEventoDeOutraOrganizacao_DeveRetornar404ENaoGravar()
    {
        var (eventoId, _) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(Rota(eventoId), CorpoValido("Invasores")));

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Convites.AnyAsync(convite => convite.Nome == "Invasores"));
    }

    [Fact]
    public async Task Atualizar_ConviteDeOutraOrganizacao_DeveRetornar404ENaoAlterar()
    {
        var (eventoId, convite) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(eventoId, convite.Id), CorpoValido("Invasores")));

        await AssertConviteDeAIntactoAsync(eventoId, convite);
    }

    [Fact]
    public async Task Remover_ConviteDeOutraOrganizacao_DeveRetornar404ENaoExcluir()
    {
        var (eventoId, convite) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(eventoId, convite.Id)));

        await AssertConviteDeAIntactoAsync(eventoId, convite);
    }

    [Fact]
    public async Task ConviteDeAViaEventoDeB_DeveRetornar404()
    {
        var (_, convite) = await CriarDeAAsync();
        var eventoDeB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(Rota(eventoDeB.Id, convite.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(eventoDeB.Id, convite.Id), CorpoValido("Invasores")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(eventoDeB.Id, convite.Id)));
    }

    [Fact]
    public async Task Atualizar_ComIdDeConvidadoDeOutraOrganizacao_DeveRejeitarENaoAlterar()
    {
        var (eventoIdA, conviteA) = await CriarDeAAsync();
        var eventoDeB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);
        var conviteB = await CriarAsync(OrganizacaoB.Cliente, eventoDeB.Id);

        var resposta = await OrganizacaoB.Cliente.PutAsJsonAsync(
            Rota(eventoDeB.Id, conviteB.Id),
            CorpoValido("Família B", null, 0, Pessoa("Sequestro", id: conviteA.Convidados[0].Id)));

        Assert.Equal(System.Net.HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        await AssertConviteDeAIntactoAsync(eventoIdA, conviteA);
    }

    [Fact]
    public async Task Listagem_DeB_NaoContemConvitesDeA()
    {
        await CriarDeAAsync();
        var eventoDeB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);
        await CriarAsync(OrganizacaoB.Cliente, eventoDeB.Id, CorpoValido("Família B", null, 0, Pessoa("Beatriz")));

        var lista = await ListarAsync(OrganizacaoB.Cliente, eventoDeB.Id);

        Assert.Equal("Família B", Assert.Single(lista.Convites).Nome);
        Assert.Equal(1, lista.Totais.Pessoas);

        await using var contextoB = CriarContexto(OrganizacaoB);
        Assert.All(await contextoB.Convidados.ToListAsync(), convidado => Assert.Equal(OrganizacaoB.OrganizacaoId, convidado.OrganizacaoId));
    }
}
