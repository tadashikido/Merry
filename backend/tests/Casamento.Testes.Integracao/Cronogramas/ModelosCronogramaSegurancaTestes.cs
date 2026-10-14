using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Casamentos;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.Cronogramas.ClienteModelosCronograma;
using ClienteAcessoCasal = Casamento.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;

namespace Casamento.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ModelosCronogramaSegurancaTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesCasal = [];

    public ModelosCronogramaSegurancaTestes(BancoPostgreSqlFixture banco)
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
    public async Task Casal_DeveReceber403EmModelosAplicacaoSalvarERecalculo()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var modelo = await CriarAsync(OrganizacaoA.Cliente);
        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);

        var respostas = new[]
        {
            await casal.GetAsync(RotaModelos),
            await casal.PostAsJsonAsync(RotaModelos, new { nome = "Do casal" }),
            await casal.GetAsync(RotaModelo(modelo.Id)),
            await casal.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Alterado" }),
            await casal.DeleteAsync(RotaModelo(modelo.Id)),
            await casal.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem()),
            await casal.PutAsJsonAsync(RotaItem(modelo.Id, item.Id), CorpoItem()),
            await casal.DeleteAsync(RotaItem(modelo.Id, item.Id)),
            await casal.PostAsJsonAsync(RotaSalvarComoModelo(casamentoId), new { nome = "Nosso roteiro" }),
            await casal.GetAsync(RotaPrevia(casamentoId, modelo.Id)),
            await AplicarAsync(casal, casamentoId, modelo.Id),
            await casal.GetAsync(RotaRecalculo(casamentoId)),
            await casal.PostAsync(RotaRecalculo(casamentoId), null),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode));
        Assert.Single((await ObterAsync(OrganizacaoA.Cliente, modelo.Id)).Itens);
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamentoId)).Itens);
    }

    [Fact]
    public async Task Casal_CronogramaNaoDeveExporHorariosDesatualizados()
    {
        var (casamentoId, casal) = await CriarCasalAsync();
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamentoId, sugerido.Id);
        Assert.Equal(
            HttpStatusCode.OK,
            (await OrganizacaoA.Cliente.PutAsJsonAsync($"{ClienteCasamentos.Rota}/{casamentoId}", ClienteCasamentos.CorpoValido(horario: "18:00"))).StatusCode);

        var resposta = await casal.GetAsync(ClienteCronograma.Rota(casamentoId));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var cronograma = (await resposta.Content.ReadFromJsonAsync<Casamento.Aplicacao.Cronogramas.CronogramaDto>())!;
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
        var casamentoDeB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPrevia(casamentoDeB.Id, modeloDeA.Id)));
        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoB.Cliente, casamentoDeB.Id, modeloDeA.Id));
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoB.Cliente, casamentoDeB.Id)).Itens);
    }

    [Fact]
    public async Task CasamentoDeOutraOrganizacao_DeveReceber404EmSalvarPreviaAplicarERecalcular()
    {
        var casamentoDeA = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamentoDeA.Id);
        var modeloDeB = await SugeridoAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaSalvarComoModelo(casamentoDeA.Id), new { nome = "Roubado" }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPrevia(casamentoDeA.Id, modeloDeB.Id)));
        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoB.Cliente, casamentoDeA.Id, modeloDeB.Id));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaRecalculo(casamentoDeA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(RotaRecalculo(casamentoDeA.Id), null));
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
