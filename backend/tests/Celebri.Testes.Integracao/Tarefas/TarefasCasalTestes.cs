using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Tarefas;
using Celebri.Dominio.Tarefas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Tarefas.ClienteTarefas;
using ClienteAcessoCasal = Celebri.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Tarefas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class TarefasCasalTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesCasal = [];

    public TarefasCasalTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesCasal)
        {
            cliente.Dispose();
        }
    }

    private async Task<(Guid CasamentoId, HttpClient Cliente)> CriarCasalAsync()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var email = ClienteAcessoCasal.EmailCasalUnico();
        await ClienteAcessoCasal.ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, email);
        var aceite = await ClienteAcessoCasal.AceitarAsync(ClienteAnonimo, ClienteAcessoCasal.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;

        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientesCasal.Add(cliente);
        return (casamento.Id, cliente);
    }

    [Fact]
    public async Task Casal_DeveVerSomenteAsTarefasDoCasal()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var interna = await CriarAsync(OrganizacaoA.Cliente, casamentoId, Corpo("Negociar comissão do buffet", "Assessoria", ClienteCasamentos.HojeEmSaoPaulo().AddDays(-1)));
        var doCasal = await CriarAsync(OrganizacaoA.Cliente, casamentoId, Corpo("Enviar lista de padrinhos", "Casal"));

        var resposta = await casal.GetAsync(Rota(casamentoId));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.DoesNotContain("comissão", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        var lista = (await resposta.Content.ReadFromJsonAsync<ListaTarefasDto>())!;
        Assert.Equal(doCasal.Id, Assert.Single(lista.Tarefas).Id);
        Assert.True(lista.SomenteDoCasal);
        Assert.Equal(0, lista.Resumo.Atrasadas);
        Assert.Equal(1, lista.Resumo.Total);

        await AssertNaoEncontradoAsync(await casal.GetAsync(Rota(casamentoId, interna.Id)));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(casal, casamentoId, interna.Id, "Concluida"));
        var intacta = await OrganizacaoA.Cliente.GetFromJsonAsync<TarefaDto>(Rota(casamentoId, interna.Id));
        Assert.Equal("AFazer", intacta!.Status);
    }

    [Fact]
    public async Task Casal_DeveConcluirEReabrirTarefaDoCasal()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamentoId, Corpo("Escolher música da entrada", "Casal"));

        var concluir = await AlterarStatusAsync(casal, casamentoId, tarefa.Id, "Concluida");

        Assert.Equal(HttpStatusCode.OK, concluir.StatusCode);
        var concluida = (await concluir.Content.ReadFromJsonAsync<TarefaDto>())!;
        Assert.Equal("Concluida", concluida.Status);
        Assert.Equal("Casal", concluida.ConcluidaPor);
        var vistaPelaAssessoria = await OrganizacaoA.Cliente.GetFromJsonAsync<TarefaDto>(Rota(casamentoId, tarefa.Id));
        Assert.Equal("Casal", vistaPelaAssessoria!.ConcluidaPor);

        var reabrir = await AlterarStatusAsync(casal, casamentoId, tarefa.Id, "AFazer");

        Assert.Equal(HttpStatusCode.OK, reabrir.StatusCode);
        Assert.Null((await reabrir.Content.ReadFromJsonAsync<TarefaDto>())!.ConcluidaPor);
    }

    [Theory]
    [InlineData("Cancelada")]
    [InlineData("EmAndamento")]
    public async Task Casal_StatusDaAssessoria_DeveRetornar422(string status)
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamentoId, Corpo("Escolher música", "Casal"));

        var resposta = await AlterarStatusAsync(casal, casamentoId, tarefa.Id, status);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        var problema = await resposta.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(MensagensTarefas.StatusNaoPermitidoCasal, problema!.Detail);
    }

    [Fact]
    public async Task Casal_CriarEditarExcluirEPendencias_DevemRetornar403ENaoGravar()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamentoId, Corpo("Tarefa do casal", "Casal"));

        Assert.Equal(HttpStatusCode.Forbidden, (await casal.PostAsJsonAsync(Rota(casamentoId), Corpo("Criada pelo casal", "Casal"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await casal.PutAsJsonAsync(Rota(casamentoId, tarefa.Id), Corpo("Editada pelo casal", "Casal"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await casal.DeleteAsync(Rota(casamentoId, tarefa.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await casal.GetAsync(RotaPendencias)).StatusCode);

        await using var contexto = CriarContexto(OrganizacaoA);
        var tarefas = await contexto.TarefasCasamento.ToListAsync();
        Assert.Equal("Tarefa do casal", Assert.Single(tarefas).Titulo);
    }

    [Fact]
    public async Task Casal_NaoDeveAcessarTarefasDeOutroCasamento()
    {
        var (_, casal) = await CriarCasalAsync();
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(nomePrimeiraPessoa: "Outra Noiva"));
        var tarefaOutro = await CriarAsync(OrganizacaoA.Cliente, outro.Id, Corpo("Do outro casamento", "Casal"));
        var deB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);
        var tarefaDeB = await CriarAsync(OrganizacaoB.Cliente, deB.Id, Corpo("De outra assessoria", "Casal"));

        await AssertNaoEncontradoAsync(await casal.GetAsync(Rota(outro.Id)));
        await AssertNaoEncontradoAsync(await casal.GetAsync(Rota(outro.Id, tarefaOutro.Id)));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(casal, outro.Id, tarefaOutro.Id, "Concluida"));
        await AssertNaoEncontradoAsync(await casal.GetAsync(Rota(deB.Id)));
        await AssertNaoEncontradoAsync(await AlterarStatusAsync(casal, deB.Id, tarefaDeB.Id, "Concluida"));

        var intacta = await OrganizacaoA.Cliente.GetFromJsonAsync<TarefaDto>(Rota(outro.Id, tarefaOutro.Id));
        Assert.Equal("AFazer", intacta!.Status);
    }

    [Fact]
    public async Task Casal_EmCasamentoArquivado_NaoPodeConcluir()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamentoId, Corpo("Tarefa do casal", "Casal"));
        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamentoId}/arquivar", null);

        var resposta = await AlterarStatusAsync(casal, casamentoId, tarefa.Id, "Concluida");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await casal.GetAsync(Rota(casamentoId))).StatusCode);
    }
}
