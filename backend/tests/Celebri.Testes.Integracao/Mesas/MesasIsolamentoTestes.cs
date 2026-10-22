using System.Net;
using System.Net.Http.Json;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Eventos;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Testes.Integracao.Mesas;

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
        var eventoA = (await ClienteEventos.CriarAsync(OrganizacaoA.Cliente)).Id;
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoA, 1, 8, "Padrinhos");
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoA, "Família Souza", "Carla Souza");
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoA, mesa.Id, convite.Convidados[0].Id);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(ClienteMesas.Rota(eventoA)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(ClienteMesas.Rota(eventoA), ClienteMesas.Corpo(2)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(ClienteMesas.Rota(eventoA, mesa.Id), ClienteMesas.Corpo(1, "Invasão", 2)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(ClienteMesas.Rota(eventoA, mesa.Id)));
        await AssertNaoEncontradoAsync(await ClienteMesas.SentarAsync(OrganizacaoB.Cliente, eventoA, mesa.Id, convite.Convidados[0].Id));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(ClienteMesas.RotaRetirada(eventoA), ClienteMesas.Pessoas(convite.Convidados[0].Id)));

        var eventoB = (await ClienteEventos.CriarAsync(OrganizacaoB.Cliente)).Id;
        var mesaB = await ClienteMesas.CriarAsync(OrganizacaoB.Cliente, eventoB);
        var cruzado = await ClienteMesas.SentarAsync(OrganizacaoB.Cliente, eventoB, mesaB.Id, convite.Convidados[0].Id);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, cruzado.StatusCode);
        var mapaB = await ClienteMesas.MapaAsync(OrganizacaoB.Cliente, eventoB);
        Assert.DoesNotContain(mapaB.Mesas, item => item.Id == mesa.Id);
        Assert.Empty(mapaB.Pessoas);

        await using var contexto = CriarContexto(OrganizacaoA);
        var intacta = await contexto.Mesas.SingleAsync(item => item.Id == mesa.Id);
        Assert.Equal((1, "Padrinhos", 8), (intacta.Numero, intacta.Nome, intacta.Capacidade));
        Assert.Equal(mesa.Id, (await contexto.Convidados.SingleAsync(item => item.Id == convite.Convidados[0].Id)).MesaId);
    }
}
