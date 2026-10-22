using System.Net.Http.Json;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Eventos;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Testes.Integracao.Cronogramas;

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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteCronograma.Rota(evento.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteCronograma.Rota(evento.Id, item.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(
            ClienteCronograma.Rota(evento.Id, item.Id),
            ClienteCronograma.Corpo("Invasão")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(ClienteCronograma.Rota(evento.Id, item.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(evento.Id),
            ClienteCronograma.Corpo("Invasão")));

        await using var contexto = CriarContexto(OrganizacaoA);
        var intacto = await contexto.ItensCronograma.AsNoTracking().SingleAsync(atual => atual.Id == item.Id);
        Assert.Equal("Cerimônia", intacto.Atividade);
        Assert.Equal(OrganizacaoA.OrganizacaoId, intacto.OrganizacaoId);
        Assert.Equal(1, await contexto.ItensCronograma.CountAsync(atual => atual.EventoId == evento.Id));
    }

    [Fact]
    public async Task ItemDeOutraOrganizacaoPelaRotaDoProprioEvento_DeveRetornar404()
    {
        var deA = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var itemDeA = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, deA.Id);
        var deB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteCronograma.Rota(deB.Id, itemDeA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(ClienteCronograma.Rota(deB.Id, itemDeA.Id)));
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoB.Cliente, deB.Id)).Itens);
    }

    [Fact]
    public async Task FornecedorDeOutraOrganizacao_NaoPodeSerVinculado()
    {
        var deA = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var vinculoDeA = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, deA.Id, "Fornecedor de A");
        var deB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        var resposta = await OrganizacaoB.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(deB.Id),
            ClienteCronograma.Corpo(fornecedorEventoId: vinculoDeA));

        Assert.Equal(System.Net.HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.DoesNotContain("Fornecedor de A", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }
}
