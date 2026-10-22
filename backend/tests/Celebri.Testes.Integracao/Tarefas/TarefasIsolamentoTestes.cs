using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Tarefas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Tarefas.ClienteTarefas;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Tarefas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class TarefasIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public TarefasIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private async Task<(Guid EventoId, TarefaDto Tarefa)> CriarDeAAsync()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, evento.Id, Corpo("Contratar fotógrafo Souza"));
        return (evento.Id, tarefa);
    }

    private async Task AssertTarefaDeAIntactaAsync(Guid eventoId, TarefaDto original)
    {
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<TarefaDto>(Rota(eventoId, original.Id));
        Assert.Equal(original.Titulo, atual!.Titulo);
        Assert.Equal("AFazer", atual.Status);
    }

    [Fact]
    public async Task Listar_TarefasDeEventoDeOutraOrganizacao_DeveRetornar404SemDados()
    {
        var (eventoId, _) = await CriarDeAAsync();

        var resposta = await OrganizacaoB.Cliente.GetAsync(Rota(eventoId));

        await AssertNaoEncontradoAsync(resposta);
        Assert.DoesNotContain("Souza", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Obter_TarefaDeOutraOrganizacao_DeveSerIndistinguivelDeInexistente()
    {
        var (eventoId, tarefa) = await CriarDeAAsync();

        var alheia = await OrganizacaoB.Cliente.GetAsync(Rota(eventoId, tarefa.Id));
        var inexistente = await OrganizacaoB.Cliente.GetAsync(Rota(Guid.NewGuid(), Guid.NewGuid()));

        await AssertNaoEncontradoAsync(alheia);
        using var jsonAlheia = JsonDocument.Parse(await alheia.Content.ReadAsStringAsync());
        using var jsonInexistente = JsonDocument.Parse(await inexistente.Content.ReadAsStringAsync());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("title").GetString(), jsonAlheia.RootElement.GetProperty("title").GetString());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("detail").GetString(), jsonAlheia.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Escritas_EmTarefaDeOutraOrganizacao_DevemRetornar404ENaoAlterar()
    {
        var (eventoId, tarefa) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(Rota(eventoId), Corpo("Invasores")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(eventoId, tarefa.Id), Corpo("Invasores")));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(OrganizacaoB.Cliente, eventoId, tarefa.Id, "Concluida"));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(eventoId, tarefa.Id)));

        await AssertTarefaDeAIntactaAsync(eventoId, tarefa);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.TarefasEvento.AnyAsync(item => item.Titulo == "Invasores"));
    }

    [Fact]
    public async Task TarefaDeAViaEventoDeB_DeveRetornar404()
    {
        var (_, tarefa) = await CriarDeAAsync();
        var eventoDeB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(Rota(eventoDeB.Id, tarefa.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(eventoDeB.Id, tarefa.Id), Corpo("Invasores")));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(OrganizacaoB.Cliente, eventoDeB.Id, tarefa.Id, "Cancelada"));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(eventoDeB.Id, tarefa.Id)));
    }

    [Fact]
    public async Task ListagemEPendenciasDeB_NaoDevemConterTarefasDeA()
    {
        await CriarDeAAsync();
        var eventoDeB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        var lista = await ListarAsync(OrganizacaoB.Cliente, eventoDeB.Id);
        var pendencias = await OrganizacaoB.Cliente.GetFromJsonAsync<PendenciasTarefasDto>(RotaPendencias);

        Assert.Empty(lista.Tarefas);
        Assert.Equal(0, pendencias!.TotalAtrasadas + pendencias.TotalEstaSemana);
    }

    [Fact]
    public async Task ContextoDeB_NaoDeveEnxergarTarefasDeANoBanco()
    {
        await CriarDeAAsync();

        await using var contextoB = CriarContexto(OrganizacaoB);
        await using var contextoSemOrganizacao = CriarContextoSemOrganizacao();

        Assert.Empty(await contextoB.TarefasEvento.ToListAsync());
        Assert.Empty(await contextoSemOrganizacao.TarefasEvento.ToListAsync());
    }
}
