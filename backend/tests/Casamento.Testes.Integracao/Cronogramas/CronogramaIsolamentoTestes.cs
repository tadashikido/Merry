using System.Net.Http.Json;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Casamentos;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class CronogramaIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public CronogramaIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404EmLeituraEscritaEExclusaoSemAlterarDados()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteCronograma.Rota(casamento.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteCronograma.Rota(casamento.Id, item.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(
            ClienteCronograma.Rota(casamento.Id, item.Id),
            ClienteCronograma.Corpo("Invasão")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(ClienteCronograma.Rota(casamento.Id, item.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(casamento.Id),
            ClienteCronograma.Corpo("Invasão")));

        await using var contexto = CriarContexto(OrganizacaoA);
        var intacto = await contexto.ItensCronograma.AsNoTracking().SingleAsync(atual => atual.Id == item.Id);
        Assert.Equal("Cerimônia", intacto.Atividade);
        Assert.Equal(OrganizacaoA.OrganizacaoId, intacto.OrganizacaoId);
        Assert.Equal(1, await contexto.ItensCronograma.CountAsync(atual => atual.CasamentoId == casamento.Id));
    }

    [Fact]
    public async Task ItemDeOutraOrganizacaoPelaRotaDoProprioCasamento_DeveRetornar404()
    {
        var deA = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var itemDeA = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, deA.Id);
        var deB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteCronograma.Rota(deB.Id, itemDeA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(ClienteCronograma.Rota(deB.Id, itemDeA.Id)));
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoB.Cliente, deB.Id)).Itens);
    }

    [Fact]
    public async Task FornecedorDeOutraOrganizacao_NaoPodeSerVinculado()
    {
        var deA = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var vinculoDeA = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, deA.Id, "Fornecedor de A");
        var deB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        var resposta = await OrganizacaoB.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(deB.Id),
            ClienteCronograma.Corpo(fornecedorCasamentoId: vinculoDeA));

        Assert.Equal(System.Net.HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.DoesNotContain("Fornecedor de A", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }
}
