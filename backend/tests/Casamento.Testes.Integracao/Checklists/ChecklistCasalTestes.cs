using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Casamentos;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.Checklists.ClienteChecklist;
using ClienteAcessoCasal = Casamento.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteCasamentos = Casamento.Testes.Integracao.Casamentos.ClienteCasamentos;
using ClienteTarefas = Casamento.Testes.Integracao.Tarefas.ClienteTarefas;

namespace Casamento.Testes.Integracao.Checklists;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ChecklistCasalTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesCasal = [];

    public ChecklistCasalTestes(BancoPostgreSqlFixture banco)
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
    public async Task Casal_NaoDeveAcessarModelosNemChecklist()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 30]);

        var respostas = new[]
        {
            await casal.GetAsync(RotaModelos),
            await casal.PostAsJsonAsync(RotaModelos, new { nome = "Do casal" }),
            await casal.GetAsync(RotaModelo(modelo.Id)),
            await casal.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Alterado" }),
            await casal.DeleteAsync(RotaModelo(modelo.Id)),
            await casal.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem()),
            await casal.GetAsync(RotaChecklist(casamentoId)),
            await casal.GetAsync(RotaPrevia(casamentoId, modelo.Id)),
            await AplicarAsync(casal, casamentoId, modelo.Id),
            await casal.GetAsync(RotaRecalculo(casamentoId)),
            await casal.PostAsync(RotaRecalculo(casamentoId), null),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.TarefasCasamento.AnyAsync());
        Assert.Equal(2, await contexto.ItensModeloChecklist.CountAsync());
    }

    [Fact]
    public async Task Casal_NaoDeveReceberPercentualMasVeTarefasDoCasalGeradas()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente);
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Escolher os trajes", 180, "Casal", "TrajesBeleza"));
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Negociar buffet", 365, "Assessoria", "Fornecedores"));
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamentoId, modelo.Id);

        var casamento = (await casal.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casamentoId}"))!;
        var daAssessoria = (await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casamentoId}"))!;
        var lista = await ClienteTarefas.ListarAsync(casal, casamentoId);

        Assert.Null(casamento.PercentualChecklist);
        Assert.Equal(0, daAssessoria.PercentualChecklist);
        Assert.Equal("Escolher os trajes", Assert.Single(lista.Tarefas).Titulo);
    }
}
