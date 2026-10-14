using System.Net.Http.Json;
using System.Text.Json;
using Casamento.Aplicacao.Convidados;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.Convidados.ClienteConvites;
using ClienteCasamentos = Casamento.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Casamento.Testes.Integracao.Convidados;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ConvitesIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public ConvitesIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    protected override bool IncluirEntidadeTeste => false;

    private async Task<(Guid CasamentoId, ConviteDto Convite)> CriarDeAAsync()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        return (casamento.Id, convite);
    }

    private async Task AssertConviteDeAIntactoAsync(Guid casamentoId, ConviteDto original)
    {
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(casamentoId, original.Id));
        Assert.Equal(original.Nome, atual!.Nome);
        Assert.Equal(original.Convidados.Select(convidado => convidado.Nome), atual.Convidados.Select(convidado => convidado.Nome));
    }

    [Fact]
    public async Task Listar_ConvitesDeCasamentoDeOutraOrganizacao_DeveRetornar404SemDados()
    {
        var (casamentoId, _) = await CriarDeAAsync();

        var resposta = await OrganizacaoB.Cliente.GetAsync(Rota(casamentoId));

        await AssertNaoEncontradoAsync(resposta);
        Assert.DoesNotContain("Souza", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync($"{Rota(casamentoId)}/totais"));
    }

    [Fact]
    public async Task Obter_ConviteDeOutraOrganizacao_DeveSerIndistinguivelDeInexistente()
    {
        var (casamentoId, convite) = await CriarDeAAsync();

        var alheio = await OrganizacaoB.Cliente.GetAsync(Rota(casamentoId, convite.Id));
        var inexistente = await OrganizacaoB.Cliente.GetAsync(Rota(Guid.NewGuid(), Guid.NewGuid()));

        await AssertNaoEncontradoAsync(alheio);
        Assert.Equal(inexistente.StatusCode, alheio.StatusCode);
        using var jsonAlheio = JsonDocument.Parse(await alheio.Content.ReadAsStringAsync());
        using var jsonInexistente = JsonDocument.Parse(await inexistente.Content.ReadAsStringAsync());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("title").GetString(), jsonAlheio.RootElement.GetProperty("title").GetString());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("detail").GetString(), jsonAlheio.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Criar_EmCasamentoDeOutraOrganizacao_DeveRetornar404ENaoGravar()
    {
        var (casamentoId, _) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(Rota(casamentoId), CorpoValido("Invasores")));

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Convites.AnyAsync(convite => convite.Nome == "Invasores"));
    }

    [Fact]
    public async Task Atualizar_ConviteDeOutraOrganizacao_DeveRetornar404ENaoAlterar()
    {
        var (casamentoId, convite) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(casamentoId, convite.Id), CorpoValido("Invasores")));

        await AssertConviteDeAIntactoAsync(casamentoId, convite);
    }

    [Fact]
    public async Task Remover_ConviteDeOutraOrganizacao_DeveRetornar404ENaoExcluir()
    {
        var (casamentoId, convite) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(casamentoId, convite.Id)));

        await AssertConviteDeAIntactoAsync(casamentoId, convite);
    }

    [Fact]
    public async Task ConviteDeAViaCasamentoDeB_DeveRetornar404()
    {
        var (_, convite) = await CriarDeAAsync();
        var casamentoDeB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(Rota(casamentoDeB.Id, convite.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(casamentoDeB.Id, convite.Id), CorpoValido("Invasores")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(casamentoDeB.Id, convite.Id)));
    }

    [Fact]
    public async Task Atualizar_ComIdDeConvidadoDeOutraOrganizacao_DeveRejeitarENaoAlterar()
    {
        var (casamentoIdA, conviteA) = await CriarDeAAsync();
        var casamentoDeB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);
        var conviteB = await CriarAsync(OrganizacaoB.Cliente, casamentoDeB.Id);

        var resposta = await OrganizacaoB.Cliente.PutAsJsonAsync(
            Rota(casamentoDeB.Id, conviteB.Id),
            CorpoValido("Família B", null, 0, Pessoa("Sequestro", id: conviteA.Convidados[0].Id)));

        Assert.Equal(System.Net.HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        await AssertConviteDeAIntactoAsync(casamentoIdA, conviteA);
    }

    [Fact]
    public async Task Listagem_DeB_NaoContemConvitesDeA()
    {
        await CriarDeAAsync();
        var casamentoDeB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);
        await CriarAsync(OrganizacaoB.Cliente, casamentoDeB.Id, CorpoValido("Família B", null, 0, Pessoa("Beatriz")));

        var lista = await ListarAsync(OrganizacaoB.Cliente, casamentoDeB.Id);

        Assert.Equal("Família B", Assert.Single(lista.Convites).Nome);
        Assert.Equal(1, lista.Totais.Pessoas);

        await using var contextoB = CriarContexto(OrganizacaoB);
        Assert.All(await contextoB.Convidados.ToListAsync(), convidado => Assert.Equal(OrganizacaoB.OrganizacaoId, convidado.OrganizacaoId));
    }
}
