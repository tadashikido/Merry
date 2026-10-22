using System.Net;
using System.Net.Http.Json;
using Casamento.Testes.Integracao.Banco;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.Autenticacao.ClienteAutenticacao;

namespace Casamento.Testes.Integracao.Isolamento;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class IsolamentoApiTestes : IsolamentoOrganizacaoTestesBase
{
    private const string Rota = "/" + RegistrosIsoladosTestesController.Rota;

    public IsolamentoApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    protected override bool IncluirEntidadeTeste => true;

    [Fact]
    public async Task Obter_RecursoDaPropriaOrganizacao_DeveRetornar200()
    {
        var id = await CriarRegistroAsync(OrganizacaoA, "Registro de A");

        var resposta = await OrganizacaoA.Cliente.GetAsync($"{Rota}/{id}");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var registro = await resposta.Content.ReadFromJsonAsync<RegistroIsoladoResponse>();
        Assert.Equal("Registro de A", registro!.Descricao);
    }

    [Fact]
    public async Task Obter_RecursoDeOutraOrganizacao_DeveRetornar404()
    {
        var idDeB = await CriarRegistroAsync(OrganizacaoB, "Registro de B");

        var resposta = await OrganizacaoA.Cliente.GetAsync($"{Rota}/{idDeB}");

        await AssertNaoEncontradoAsync(resposta);
        Assert.DoesNotContain("Registro de B", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Obter_RecursoDeOutraOrganizacao_DeveSerIndistinguivelDeRecursoInexistente()
    {
        var idDeB = await CriarRegistroAsync(OrganizacaoB, "Registro de B");

        var respostaAlheio = await OrganizacaoA.Cliente.GetAsync($"{Rota}/{idDeB}");
        var respostaInexistente = await OrganizacaoA.Cliente.GetAsync($"{Rota}/{Guid.NewGuid()}");

        Assert.Equal(respostaInexistente.StatusCode, respostaAlheio.StatusCode);
        using var jsonAlheio = await LerJsonAsync(respostaAlheio);
        using var jsonInexistente = await LerJsonAsync(respostaInexistente);
        Assert.Equal(jsonInexistente.RootElement.GetProperty("title").GetString(), jsonAlheio.RootElement.GetProperty("title").GetString());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("detail").GetString(), jsonAlheio.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Listar_DeveRetornarSomenteRegistrosDaOrganizacaoDoToken()
    {
        await CriarRegistroAsync(OrganizacaoA, "A1");
        await CriarRegistroAsync(OrganizacaoA, "A2");
        await CriarRegistroAsync(OrganizacaoB, "B1");

        var registrosA = await OrganizacaoA.Cliente.GetFromJsonAsync<List<RegistroIsoladoResponse>>(Rota);
        var registrosB = await OrganizacaoB.Cliente.GetFromJsonAsync<List<RegistroIsoladoResponse>>(Rota);

        Assert.Equal(["A1", "A2"], registrosA!.Select(registro => registro.Descricao));
        Assert.Equal(["B1"], registrosB!.Select(registro => registro.Descricao));
    }

    [Fact]
    public async Task Alterar_RecursoDeOutraOrganizacao_DeveRetornar404SemAlterarDados()
    {
        var idDeB = await CriarRegistroAsync(OrganizacaoB, "Original de B");

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync($"{Rota}/{idDeB}", new { descricao = "Invadido por A" });

        await AssertNaoEncontradoAsync(resposta);
        await using var contexto = CriarContexto(OrganizacaoB);
        var registro = await contexto.Set<RegistroIsolado>().SingleAsync(item => item.Id == idDeB);
        Assert.Equal("Original de B", registro.Descricao);
    }

    [Fact]
    public async Task Excluir_RecursoDeOutraOrganizacao_DeveRetornar404SemExcluir()
    {
        var idDeB = await CriarRegistroAsync(OrganizacaoB, "Registro de B");

        var resposta = await OrganizacaoA.Cliente.DeleteAsync($"{Rota}/{idDeB}");

        await AssertNaoEncontradoAsync(resposta);
        await using var contexto = CriarContexto(OrganizacaoB);
        Assert.True(await contexto.Set<RegistroIsolado>().AnyAsync(item => item.Id == idDeB));
    }

    [Fact]
    public async Task Excluir_RecursoDaPropriaOrganizacao_DeveRetornar204()
    {
        var id = await CriarRegistroAsync(OrganizacaoA, "Registro de A");

        var resposta = await OrganizacaoA.Cliente.DeleteAsync($"{Rota}/{id}");

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Set<RegistroIsolado>().AnyAsync(item => item.Id == id));
    }

    [Fact]
    public async Task Criar_ComOrganizacaoIdDeOutraOrganizacaoNoCorpo_DeveGravarNaOrganizacaoDoToken()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, new
        {
            descricao = "Tentativa de mass assignment",
            organizacaoId = OrganizacaoB.OrganizacaoId,
        });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var criado = await resposta.Content.ReadFromJsonAsync<RegistroIsoladoResponse>();
        await using var contexto = CriarContextoSemOrganizacao();
        var registro = await contexto.Set<RegistroIsolado>().IgnoreQueryFilters().SingleAsync(item => item.Id == criado!.Id);
        Assert.Equal(OrganizacaoA.OrganizacaoId, registro.OrganizacaoId);
    }

    [Fact]
    public async Task Criar_ComOrganizacaoIdNaQuery_DeveGravarNaOrganizacaoDoToken()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            $"{Rota}?organizacaoId={OrganizacaoB.OrganizacaoId}",
            new { descricao = "Tentativa via query" });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        await using var contextoB = CriarContexto(OrganizacaoB);
        Assert.False(await contextoB.Set<RegistroIsolado>().AnyAsync());
    }

    [Fact]
    public async Task AlterarSemConsulta_EntidadeDeOutraOrganizacao_DeveSerBloqueadaPeloInterceptorCom404()
    {
        var idDeB = await CriarRegistroAsync(OrganizacaoB, "Original de B");

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{idDeB}/sem-consulta?organizacaoId={OrganizacaoB.OrganizacaoId}",
            new { descricao = "Invadido por A" });

        await AssertNaoEncontradoAsync(resposta);
        using var json = await LerJsonAsync(resposta);
        Assert.False(json.RootElement.TryGetProperty("detail", out _));
        await using var contexto = CriarContexto(OrganizacaoB);
        var registro = await contexto.Set<RegistroIsolado>().SingleAsync(item => item.Id == idDeB);
        Assert.Equal("Original de B", registro.Descricao);
    }

    [Fact]
    public async Task Obter_SemToken_DeveRetornar401()
    {
        var id = await CriarRegistroAsync(OrganizacaoA, "Registro de A");

        var resposta = await ClienteAnonimo.GetAsync($"{Rota}/{id}");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Autenticacao_DeveContinuarFuncionandoComEntidadesDeAutenticacaoForaDoFiltro()
    {
        var entrar = await EntrarAsync(ClienteAnonimo, OrganizacaoA.Email);
        Assert.Equal(HttpStatusCode.OK, entrar.StatusCode);

        var eu = await ObterEuAsync(ClienteAnonimo, OrganizacaoB.TokenAcesso);
        Assert.Equal(HttpStatusCode.OK, eu.StatusCode);
    }

    private static async Task<Guid> CriarRegistroAsync(OrganizacaoTeste organizacao, string descricao)
    {
        var resposta = await organizacao.Cliente.PostAsJsonAsync(Rota, new { descricao });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var registro = await resposta.Content.ReadFromJsonAsync<RegistroIsoladoResponse>();
        return registro!.Id;
    }
}
