using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Eventos;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Cronogramas.ClienteModelosCronograma;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;

namespace Celebri.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ModelosCronogramaSegurancaTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesAnfitriao = [];

    public ModelosCronogramaSegurancaTestes(BancoPostgreSqlFixture banco)
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
    public async Task Anfitriao_DeveReceber403EmModelosAplicacaoSalvarERecalculo()
    {
        var (eventoId, anfitriao) = await CriarAnfitriaoAsync();
        var modelo = await CriarAsync(OrganizacaoA.Cliente);
        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);

        var respostas = new[]
        {
            await anfitriao.GetAsync(RotaModelos),
            await anfitriao.PostAsJsonAsync(RotaModelos, new { nome = "Dos anfitriões" }),
            await anfitriao.GetAsync(RotaModelo(modelo.Id)),
            await anfitriao.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Alterado" }),
            await anfitriao.DeleteAsync(RotaModelo(modelo.Id)),
            await anfitriao.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem()),
            await anfitriao.PutAsJsonAsync(RotaItem(modelo.Id, item.Id), CorpoItem()),
            await anfitriao.DeleteAsync(RotaItem(modelo.Id, item.Id)),
            await anfitriao.PostAsJsonAsync(RotaSalvarComoModelo(eventoId), new { nome = "Nosso roteiro" }),
            await anfitriao.GetAsync(RotaPrevia(eventoId, modelo.Id)),
            await AplicarAsync(anfitriao, eventoId, modelo.Id),
            await anfitriao.GetAsync(RotaRecalculo(eventoId)),
            await anfitriao.PostAsync(RotaRecalculo(eventoId), null),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode));
        Assert.Single((await ObterAsync(OrganizacaoA.Cliente, modelo.Id)).Itens);
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, eventoId)).Itens);
    }

    [Fact]
    public async Task Anfitriao_CronogramaNaoDeveExporHorariosDesatualizados()
    {
        var (eventoId, anfitriao) = await CriarAnfitriaoAsync();
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, eventoId, sugerido.Id);
        Assert.Equal(
            HttpStatusCode.OK,
            (await OrganizacaoA.Cliente.PutAsJsonAsync($"{ClienteEventos.Rota}/{eventoId}", ClienteEventos.CorpoValido(horario: "18:00"))).StatusCode);

        var resposta = await anfitriao.GetAsync(ClienteCronograma.Rota(eventoId));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var cronograma = (await resposta.Content.ReadFromJsonAsync<Celebri.Aplicacao.Cronogramas.CronogramaDto>())!;
        Assert.Equal(0, cronograma.HorariosDesatualizados);
        Assert.True(cronograma.SomenteLeitura);
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404EmModelosEItens()
    {
        var modelo = await CriarAsync(OrganizacaoA.Cliente);
        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaModelo(modelo.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Invasão" }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaModelo(modelo.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem()));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaItem(modelo.Id, item.Id), CorpoItem(atividade: "Invasão")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaItem(modelo.Id, item.Id)));
        Assert.DoesNotContain(await ListarAsync(OrganizacaoB.Cliente), atual => atual.Id == modelo.Id);

        await using var contexto = CriarContexto(OrganizacaoA);
        var intacto = await contexto.ItensModeloCronograma.AsNoTracking().SingleAsync(atual => atual.Id == item.Id);
        Assert.Equal("Chegada da banda", intacto.Atividade);
        Assert.Equal(OrganizacaoA.OrganizacaoId, intacto.OrganizacaoId);
    }

    [Fact]
    public async Task ModeloDeOutraOrganizacao_NaoPodeSerAplicadoNemPrevisto()
    {
        var modeloDeA = await SugeridoAsync(OrganizacaoA.Cliente);
        var eventoDeB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPrevia(eventoDeB.Id, modeloDeA.Id)));
        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoB.Cliente, eventoDeB.Id, modeloDeA.Id));
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoB.Cliente, eventoDeB.Id)).Itens);
    }

    [Fact]
    public async Task EventoDeOutraOrganizacao_DeveReceber404EmSalvarPreviaAplicarERecalcular()
    {
        var eventoDeA = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, eventoDeA.Id);
        var modeloDeB = await SugeridoAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaSalvarComoModelo(eventoDeA.Id), new { nome = "Roubado" }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPrevia(eventoDeA.Id, modeloDeB.Id)));
        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoB.Cliente, eventoDeA.Id, modeloDeB.Id));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaRecalculo(eventoDeA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(RotaRecalculo(eventoDeA.Id), null));
        Assert.Single(await ListarAsync(OrganizacaoB.Cliente));
    }

    [Fact]
    public async Task Anonimo_DeveReceber401()
    {
        var respostas = new[]
        {
            await ClienteAnonimo.GetAsync(RotaModelos),
            await ClienteAnonimo.PostAsJsonAsync(RotaModelos, new { nome = "Anônimo" }),
            await ClienteAnonimo.GetAsync(RotaRecalculo(Guid.NewGuid())),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode));
    }
}
