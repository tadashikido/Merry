using System.Net;
using System.Net.Http.Json;
using Celebri.Api.Tratamento;
using Celebri.Aplicacao.Eventos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using static Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;
using static Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Eventos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ConcorrenciaEventoApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ConcorrenciaEventoApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    [Fact]
    public async Task Obter_DeveExporVersaoDoEvento()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);

        var obtido = await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{Rota}/{criado.Id}");

        Assert.NotEqual(0u, criado.Versao);
        Assert.Equal(criado.Versao, obtido!.Versao);
    }

    [Fact]
    public async Task Atualizar_ComVersaoAtual_DeveRetornar200ComNovaVersao()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{criado.Id}",
            CorpoValido(nomeSegundaPessoa: "Bruna", versao: criado.Versao));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizado = (await resposta.Content.ReadFromJsonAsync<EventoDto>())!;
        Assert.Equal("Bruna", atualizado.NomeSegundaPessoa);
        Assert.NotEqual(criado.Versao, atualizado.Versao);
    }

    [Fact]
    public async Task Atualizar_DuasEdicoesConcorrentes_SegundaDeveRetornar409SemSobrescrever()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);
        var versaoInicial = criado.Versao;

        var primeira = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{criado.Id}",
            CorpoValido(nomeSegundaPessoa: "Primeira", versao: versaoInicial));
        Assert.Equal(HttpStatusCode.OK, primeira.StatusCode);

        var segunda = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{criado.Id}",
            CorpoValido(nomeSegundaPessoa: "Segunda", versao: versaoInicial));

        Assert.Equal(HttpStatusCode.Conflict, segunda.StatusCode);
        using var json = await LerJsonAsync(segunda);
        Assert.Equal(ExcecaoGlobalHandler.TituloConcorrencia, json.RootElement.GetProperty("title").GetString());

        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{Rota}/{criado.Id}");
        Assert.Equal("Primeira", atual!.NomeSegundaPessoa);
    }

    [Fact]
    public async Task Atualizar_SemVersao_DeveRetornar409SemSobrescrever()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{criado.Id}",
            CorpoValido(nomeSegundaPessoa: "SemVersao", versao: null));

        Assert.Equal(HttpStatusCode.Conflict, resposta.StatusCode);
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{Rota}/{criado.Id}");
        Assert.Equal("Bruno", atual!.NomeSegundaPessoa);
    }
}
