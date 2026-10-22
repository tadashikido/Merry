using System.Net;
using System.Net.Http.Json;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Casamentos;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Testes.Integracao.Mesas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class MesasIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public MesasIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    [Fact]
    public async Task OrganizacaoB_NaoLeNemAlteraMesasDaOrganizacaoA()
    {
        var casamentoA = (await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente)).Id;
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, casamentoA, 1, 8, "Padrinhos");
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, casamentoA, "Família Souza", "Carla Souza");
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, casamentoA, mesa.Id, convite.Convidados[0].Id);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteMesas.Rota(casamentoA)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(ClienteMesas.Rota(casamentoA), ClienteMesas.Corpo(2)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(ClienteMesas.Rota(casamentoA, mesa.Id), ClienteMesas.Corpo(1, "Invasão", 2)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(ClienteMesas.Rota(casamentoA, mesa.Id)));
        await AssertNaoEncontradoAsync(await ClienteMesas.SentarAsync(OrganizacaoB.Cliente, casamentoA, mesa.Id, convite.Convidados[0].Id));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(ClienteMesas.RotaRetirada(casamentoA), ClienteMesas.Pessoas(convite.Convidados[0].Id)));

        var casamentoB = (await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente)).Id;
        var mesaB = await ClienteMesas.CriarAsync(OrganizacaoB.Cliente, casamentoB);
        var cruzado = await ClienteMesas.SentarAsync(OrganizacaoB.Cliente, casamentoB, mesaB.Id, convite.Convidados[0].Id);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, cruzado.StatusCode);
        var mapaB = await ClienteMesas.MapaAsync(OrganizacaoB.Cliente, casamentoB);
        Assert.DoesNotContain(mapaB.Mesas, item => item.Id == mesa.Id);
        Assert.Empty(mapaB.Pessoas);

        await using var contexto = CriarContexto(OrganizacaoA);
        var intacta = await contexto.Mesas.SingleAsync(item => item.Id == mesa.Id);
        Assert.Equal((1, "Padrinhos", 8), (intacta.Numero, intacta.Nome, intacta.Capacidade));
        Assert.Equal(mesa.Id, (await contexto.Convidados.SingleAsync(item => item.Id == convite.Convidados[0].Id)).MesaId);
    }
}
