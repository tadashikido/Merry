using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Tarefas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Tarefas.ClienteTarefas;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Tarefas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class TarefasIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public TarefasIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private async Task<(Guid CasamentoId, TarefaDto Tarefa)> CriarDeAAsync()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamento.Id, Corpo("Contratar fotógrafo Souza"));
        return (casamento.Id, tarefa);
    }

    private async Task AssertTarefaDeAIntactaAsync(Guid casamentoId, TarefaDto original)
    {
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<TarefaDto>(Rota(casamentoId, original.Id));
        Assert.Equal(original.Titulo, atual!.Titulo);
        Assert.Equal("AFazer", atual.Status);
    }

    [Fact]
    public async Task Listar_TarefasDeCasamentoDeOutraOrganizacao_DeveRetornar404SemDados()
    {
        var (casamentoId, _) = await CriarDeAAsync();

        var resposta = await OrganizacaoB.Cliente.GetAsync(Rota(casamentoId));

        await AssertNaoEncontradoAsync(resposta);
        Assert.DoesNotContain("Souza", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Obter_TarefaDeOutraOrganizacao_DeveSerIndistinguivelDeInexistente()
    {
        var (casamentoId, tarefa) = await CriarDeAAsync();

        var alheia = await OrganizacaoB.Cliente.GetAsync(Rota(casamentoId, tarefa.Id));
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
        var (casamentoId, tarefa) = await CriarDeAAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(Rota(casamentoId), Corpo("Invasores")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(casamentoId, tarefa.Id), Corpo("Invasores")));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(OrganizacaoB.Cliente, casamentoId, tarefa.Id, "Concluida"));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(casamentoId, tarefa.Id)));

        await AssertTarefaDeAIntactaAsync(casamentoId, tarefa);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.TarefasCasamento.AnyAsync(item => item.Titulo == "Invasores"));
    }

    [Fact]
    public async Task TarefaDeAViaCasamentoDeB_DeveRetornar404()
    {
        var (_, tarefa) = await CriarDeAAsync();
        var casamentoDeB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(Rota(casamentoDeB.Id, tarefa.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(Rota(casamentoDeB.Id, tarefa.Id), Corpo("Invasores")));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(OrganizacaoB.Cliente, casamentoDeB.Id, tarefa.Id, "Cancelada"));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(Rota(casamentoDeB.Id, tarefa.Id)));
    }

    [Fact]
    public async Task ListagemEPendenciasDeB_NaoDevemConterTarefasDeA()
    {
        await CriarDeAAsync();
        var casamentoDeB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        var lista = await ListarAsync(OrganizacaoB.Cliente, casamentoDeB.Id);
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

        Assert.Empty(await contextoB.TarefasCasamento.ToListAsync());
        Assert.Empty(await contextoSemOrganizacao.TarefasCasamento.ToListAsync());
    }
}
