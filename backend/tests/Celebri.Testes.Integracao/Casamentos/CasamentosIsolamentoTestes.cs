using System.Net.Http.Json;
using Celebri.Aplicacao.Casamentos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;
using static Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Casamentos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class CasamentosIsolamentoTestes : IsolamentoOrganizacaoTestesBase
{
    public CasamentosIsolamentoTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    protected override bool IncluirEntidadeTeste => false;

    [Fact]
    public async Task Obter_CasamentoDeOutraOrganizacao_DeveRetornar404()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoB.Cliente.GetAsync($"{Rota}/{deA.Id}");

        await AssertNaoEncontradoAsync(resposta);
        Assert.DoesNotContain("Ana Beatriz", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Obter_CasamentoDeOutraOrganizacao_DeveSerIndistinguivelDeInexistente()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);

        var alheio = await OrganizacaoB.Cliente.GetAsync($"{Rota}/{deA.Id}");
        var inexistente = await OrganizacaoB.Cliente.GetAsync($"{Rota}/{Guid.NewGuid()}");

        Assert.Equal(inexistente.StatusCode, alheio.StatusCode);
        using var jsonAlheio = await LerJsonAsync(alheio);
        using var jsonInexistente = await LerJsonAsync(inexistente);
        Assert.Equal(jsonInexistente.RootElement.GetProperty("title").GetString(), jsonAlheio.RootElement.GetProperty("title").GetString());
        Assert.Equal(jsonInexistente.RootElement.GetProperty("detail").GetString(), jsonAlheio.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Atualizar_CasamentoDeOutraOrganizacao_DeveRetornar404ENaoAlterar()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoB.Cliente.PutAsJsonAsync($"{Rota}/{deA.Id}", CorpoValido(nomeSegundaPessoa: "Invasor"));

        await AssertNaoEncontradoAsync(resposta);
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{Rota}/{deA.Id}");
        Assert.Equal("Bruno", atual!.NomeSegundaPessoa);
    }

    [Fact]
    public async Task Arquivar_CasamentoDeOutraOrganizacao_DeveRetornar404ENaoArquivar()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync($"{Rota}/{deA.Id}/arquivar", null));

        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{Rota}/{deA.Id}");
        Assert.False(atual!.Arquivado);
    }

    [Fact]
    public async Task Restaurar_CasamentoDeOutraOrganizacao_DeveRetornar404ENaoRestaurar()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);
        await OrganizacaoA.Cliente.PostAsync($"{Rota}/{deA.Id}/arquivar", null);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync($"{Rota}/{deA.Id}/restaurar", null));

        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{Rota}/{deA.Id}");
        Assert.True(atual!.Arquivado);
    }

    [Fact]
    public async Task Listar_DeveConterSomenteCasamentosDaOrganizacaoDoToken()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(nomePrimeiraPessoa: "Casal de A"));
        var arquivadoDeA = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(nomePrimeiraPessoa: "Arquivado de A"));
        await OrganizacaoA.Cliente.PostAsync($"{Rota}/{arquivadoDeA.Id}/arquivar", null);
        var deB = await CriarAsync(OrganizacaoB.Cliente, CorpoValido(nomePrimeiraPessoa: "Casal de B"));

        Assert.Equal([deB.Id], (await ListarAsync(OrganizacaoB.Cliente)).Select(item => item.Id));
        Assert.Empty(await ListarAsync(OrganizacaoB.Cliente, "Arquivados"));
        Assert.Equal([deA.Id], (await ListarAsync(OrganizacaoA.Cliente)).Select(item => item.Id));
        Assert.Equal([arquivadoDeA.Id], (await ListarAsync(OrganizacaoA.Cliente, "Arquivados")).Select(item => item.Id));
    }

    [Fact]
    public async Task DbContext_DaOrganizacaoB_NaoEnxergaCasamentoDeA_EContextoSemOrganizacaoNaoEnxergaNada()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);

        await using var contextoB = CriarContexto(OrganizacaoB);
        Assert.False(await contextoB.Casamentos.AnyAsync(item => item.Id == deA.Id));

        await using var contextoSemOrganizacao = CriarContextoSemOrganizacao();
        Assert.False(await contextoSemOrganizacao.Casamentos.AnyAsync());

        await using var contextoA = CriarContexto(OrganizacaoA);
        Assert.True(await contextoA.Casamentos.AnyAsync(item => item.Id == deA.Id));
    }
}
