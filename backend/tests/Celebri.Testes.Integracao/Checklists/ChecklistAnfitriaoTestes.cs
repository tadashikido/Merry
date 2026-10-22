using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Eventos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Checklists.ClienteChecklist;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;
using ClienteTarefas = Celebri.Testes.Integracao.Tarefas.ClienteTarefas;

namespace Celebri.Testes.Integracao.Checklists;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ChecklistAnfitriaoTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesAnfitriao = [];

    public ChecklistAnfitriaoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesAnfitriao)
        {
            cliente.Dispose();
        }
    }

    private async Task<(Guid EventoId, HttpClient Cliente)> CriarAnfitriaoAsync()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = ClienteAcessoAnfitriao.EmailAnfitriaoUnico();
        await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, email);
        var aceite = await ClienteAcessoAnfitriao.AceitarAsync(ClienteAnonimo, ClienteAcessoAnfitriao.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;

        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientesAnfitriao.Add(cliente);
        return (evento.Id, cliente);
    }

    [Fact]
    public async Task Anfitriao_NaoDeveAcessarModelosNemChecklist()
    {
        var (eventoId, anfitriao) = await CriarAnfitriaoAsync();
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 30]);

        var respostas = new[]
        {
            await anfitriao.GetAsync(RotaModelos),
            await anfitriao.PostAsJsonAsync(RotaModelos, new { nome = "Dos anfitriões" }),
            await anfitriao.GetAsync(RotaModelo(modelo.Id)),
            await anfitriao.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Alterado" }),
            await anfitriao.DeleteAsync(RotaModelo(modelo.Id)),
            await anfitriao.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem()),
            await anfitriao.GetAsync(RotaChecklist(eventoId)),
            await anfitriao.GetAsync(RotaPrevia(eventoId, modelo.Id)),
            await AplicarAsync(anfitriao, eventoId, modelo.Id),
            await anfitriao.GetAsync(RotaRecalculo(eventoId)),
            await anfitriao.PostAsync(RotaRecalculo(eventoId), null),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.TarefasEvento.AnyAsync());
        Assert.Equal(2, await contexto.ItensModeloChecklist.CountAsync());
    }

    [Fact]
    public async Task Anfitriao_NaoDeveReceberPercentualMasVeTarefasDoAnfitriaoGeradas()
    {
        var (eventoId, anfitriao) = await CriarAnfitriaoAsync();
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente);
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Escolher os trajes", 180, "Anfitriao", "TrajesBeleza"));
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Negociar buffet", 365, "Assessoria", "Fornecedores"));
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, eventoId, modelo.Id);

        var evento = (await anfitriao.GetFromJsonAsync<EventoDto>($"{ClienteEventos.Rota}/{eventoId}"))!;
        var daAssessoria = (await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{ClienteEventos.Rota}/{eventoId}"))!;
        var lista = await ClienteTarefas.ListarAsync(anfitriao, eventoId);

        Assert.Null(evento.PercentualChecklist);
        Assert.Equal(0, daAssessoria.PercentualChecklist);
        Assert.Equal("Escolher os trajes", Assert.Single(lista.Tarefas).Titulo);
    }
}
