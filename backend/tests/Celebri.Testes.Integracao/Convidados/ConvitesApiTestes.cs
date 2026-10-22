using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Casamento.Aplicacao.Convidados;
using Casamento.Dominio.Convidados;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.Convidados.ClienteConvites;
using ClienteCasamentos = Casamento.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Casamento.Testes.Integracao.Convidados;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ConvitesApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ConvitesApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private async Task<Guid> CriarCasamentoAsync(HttpClient? cliente = null, int? convidadosEstimados = 150)
    {
        var casamento = await ClienteCasamentos.CriarAsync(
            cliente ?? OrganizacaoA.Cliente,
            ClienteCasamentos.CorpoValido(convidadosEstimados: convidadosEstimados));
        return casamento.Id;
    }

    private static async Task<JsonDocument> LerJsonAsync(HttpResponseMessage resposta)
    {
        return JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Criar_DadosValidos_DeveRetornar201NormalizadoComPadroesESemOrganizacao()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamentoId), CorpoValido(grupo: "  Família   da noiva "));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var json = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", json, StringComparison.OrdinalIgnoreCase);
        var convite = JsonSerializer.Deserialize<ConviteDto>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal($"/api/casamentos/{casamentoId}/convites/{convite.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("Família Souza", convite.Nome);
        Assert.Equal("Família da noiva", convite.Grupo);
        Assert.Equal(1, convite.LimiteAcompanhantes);
        Assert.Equal("NaoEnviado", convite.StatusEnvio);
        Assert.Collection(
            convite.Convidados,
            carla =>
            {
                Assert.Equal("Carla Souza", carla.Nome);
                Assert.Equal("11987654321", carla.Telefone);
                Assert.Equal("carla@exemplo.com", carla.Email);
                Assert.Equal("Adulto", carla.FaixaEtaria);
                Assert.Equal("Pendente", carla.Resposta);
            },
            pedro =>
            {
                Assert.Equal("Pedro Souza", pedro.Nome);
                Assert.Null(pedro.Telefone);
                Assert.Equal("Crianca", pedro.FaixaEtaria);
                Assert.Equal("Pendente", pedro.Resposta);
            });
    }

    [Fact]
    public async Task Criar_DevePersistirConviteEConvidadosNaOrganizacaoECasamentoCorretos()
    {
        var casamentoId = await CriarCasamentoAsync();

        var convite = await CriarAsync(OrganizacaoA.Cliente, casamentoId);

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.Convites.Include(item => item.Convidados).SingleAsync(item => item.Id == convite.Id);
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravado.OrganizacaoId);
        Assert.Equal(casamentoId, gravado.CasamentoId);
        Assert.All(gravado.Convidados, convidado =>
        {
            Assert.Equal(OrganizacaoA.OrganizacaoId, convidado.OrganizacaoId);
            Assert.Equal(casamentoId, convidado.CasamentoId);
            Assert.Equal(convite.Id, convidado.ConviteId);
        });
    }

    [Fact]
    public async Task Criar_SemNome_DeveUsarNomeDoPrimeiroConvidado()
    {
        var casamentoId = await CriarCasamentoAsync();

        var convite = await CriarAsync(OrganizacaoA.Cliente, casamentoId, CorpoValido(nome: "  ", grupo: null, limiteAcompanhantes: null, Pessoa("Ana Lima")));

        Assert.Equal("Ana Lima", convite.Nome);
        Assert.Null(convite.Grupo);
        Assert.Equal(0, convite.LimiteAcompanhantes);
    }

    [Fact]
    public async Task Listar_DeveRetornarConvitesOrdenadosTotaisEstimativa()
    {
        var casamentoId = await CriarCasamentoAsync(convidadosEstimados: 150);
        await CriarAsync(OrganizacaoA.Cliente, casamentoId, CorpoValido("Zélia e família", null, 1,
            Pessoa("Zélia", resposta: "Confirmado"),
            Pessoa("Rui", resposta: "Confirmado"),
            Pessoa("Téo", faixaEtaria: "Crianca", resposta: "Confirmado")));
        await CriarAsync(OrganizacaoA.Cliente, casamentoId, CorpoValido("álvaro", null, 0,
            Pessoa("Álvaro", resposta: "Confirmado"),
            Pessoa("Bia", resposta: "Pendente")));
        await CriarAsync(OrganizacaoA.Cliente, casamentoId, CorpoValido("Beto", null, 2,
            Pessoa("Beto", resposta: "Pendente"),
            Pessoa("Lia", faixaEtaria: "Crianca", resposta: "Recusado")));

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamentoId);

        Assert.Equal(["álvaro", "Beto", "Zélia e família"], lista.Convites.Select(convite => convite.Nome));
        Assert.Equal(150, lista.ConvidadosEstimados);
        Assert.False(lista.CasamentoArquivado);
        var totais = lista.Totais;
        Assert.Equal(3, totais.Convites);
        Assert.Equal(7, totais.Pessoas);
        Assert.Equal(5, totais.Adultos);
        Assert.Equal(2, totais.Criancas);
        Assert.Equal(3, totais.AcompanhantesPermitidos);
        Assert.Equal(new TotaisPorFaixaDto(3, 1, 4), totais.Confirmados);
        Assert.Equal(new TotaisPorFaixaDto(2, 0, 2), totais.Pendentes);
        Assert.Equal(new TotaisPorFaixaDto(0, 1, 1), totais.Recusados);

        var totaisDiretos = await OrganizacaoA.Cliente.GetFromJsonAsync<TotaisConvidadosDto>($"{Rota(casamentoId)}/totais");
        Assert.Equal(totais, totaisDiretos);
    }

    [Fact]
    public async Task Listar_CasamentoSemConvites_DeveRetornarTotaisZerados()
    {
        var casamentoId = await CriarCasamentoAsync(convidadosEstimados: null);

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamentoId);
        var totais = await OrganizacaoA.Cliente.GetFromJsonAsync<TotaisConvidadosDto>($"{Rota(casamentoId)}/totais");

        Assert.Empty(lista.Convites);
        Assert.Null(lista.ConvidadosEstimados);
        Assert.Equal(0, lista.Totais.Pessoas);
        Assert.Equal(lista.Totais, totais);
    }

    [Fact]
    public async Task Obter_DeveRetornarConvite()
    {
        var casamentoId = await CriarCasamentoAsync();
        var criado = await CriarAsync(OrganizacaoA.Cliente, casamentoId);

        var obtido = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(casamentoId, criado.Id));

        Assert.Equal(criado.Id, obtido!.Id);
        Assert.Equal(2, obtido.Convidados.Count);
    }

    [Fact]
    public async Task Atualizar_DeveSincronizarConvidadosPorIdEOrdem()
    {
        var casamentoId = await CriarCasamentoAsync();
        var criado = await CriarAsync(OrganizacaoA.Cliente, casamentoId, CorpoValido("Família Lima", null, 0,
            Pessoa("Ana"), Pessoa("Bruno"), Pessoa("Caio")));
        var ana = criado.Convidados[0];
        var caio = criado.Convidados[2];

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(casamentoId, criado.Id), CorpoValido("Família Lima", "Amigos", 2,
            Pessoa("Caio Lima", resposta: "Confirmado", id: caio.Id),
            Pessoa("Duda", faixaEtaria: "Crianca"),
            Pessoa("Ana", id: ana.Id)));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizado = (await resposta.Content.ReadFromJsonAsync<ConviteDto>())!;
        Assert.Equal(["Caio Lima", "Duda", "Ana"], atualizado.Convidados.Select(convidado => convidado.Nome));
        Assert.Equal(caio.Id, atualizado.Convidados[0].Id);
        Assert.Equal("Confirmado", atualizado.Convidados[0].Resposta);
        Assert.Equal(ana.Id, atualizado.Convidados[2].Id);
        Assert.Equal("Amigos", atualizado.Grupo);
        Assert.Equal(2, atualizado.LimiteAcompanhantes);

        await using var contexto = CriarContexto(OrganizacaoA);
        var nomes = await contexto.Convidados.Where(convidado => convidado.ConviteId == criado.Id).OrderBy(convidado => convidado.Ordem).Select(convidado => convidado.Nome).ToListAsync();
        Assert.Equal(["Caio Lima", "Duda", "Ana"], nomes);
    }

    [Fact]
    public async Task Atualizar_ComConvidadoDeOutroConvite_DeveRetornar422ENaoAlterar()
    {
        var casamentoId = await CriarCasamentoAsync();
        var primeiro = await CriarAsync(OrganizacaoA.Cliente, casamentoId);
        var segundo = await CriarAsync(OrganizacaoA.Cliente, casamentoId, CorpoValido("Outro", null, 0, Pessoa("Rita")));

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(casamentoId, primeiro.Id), CorpoValido("Família Souza", null, 0,
            Pessoa("Rita roubada", id: segundo.Convidados[0].Id)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.Equal(MensagensConvidados.ConvidadoDeOutroConvite, json.RootElement.GetProperty("detail").GetString());
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(casamentoId, segundo.Id));
        Assert.Equal("Rita", atual!.Convidados[0].Nome);
        var primeiroAtual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(casamentoId, primeiro.Id));
        Assert.Equal(2, primeiroAtual!.Convidados.Count);
    }

    [Fact]
    public async Task Atualizar_SemConvidados_DeveRetornar400ENaoAlterar()
    {
        var casamentoId = await CriarCasamentoAsync();
        var criado = await CriarAsync(OrganizacaoA.Cliente, casamentoId);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(casamentoId, criado.Id), new { nome = "X", convidados = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(casamentoId, criado.Id));
        Assert.Equal(2, atual!.Convidados.Count);
    }

    [Fact]
    public async Task Criar_ComTelefoneEEmailInvalidos_DeveRetornar400PorCampo()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamentoId), CorpoValido("Família", null, 0,
            Pessoa("Ana"),
            Pessoa("Bia", telefone: "123", email: "ana@")));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.Equal(MensagensConvidados.TelefoneInvalido, erros.GetProperty("Convidados[1].Telefone")[0].GetString());
        Assert.Equal(MensagensConvidados.EmailInvalido, erros.GetProperty("Convidados[1].Email")[0].GetString());
        Assert.DoesNotContain("ana@", json.RootElement.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Criar_ComNomeDeConvidadoAusenteELimiteInvalido_DeveRetornar400PorCampo()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamentoId), new
        {
            nome = "Família",
            limiteAcompanhantes = 11,
            convidados = new object[] { new { nome = (string?)null } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.True(erros.TryGetProperty("Convidados[0].Nome", out _));
        Assert.Equal(MensagensConvidados.LimiteAcompanhantesForaDaFaixa, erros.GetProperty("LimiteAcompanhantes")[0].GetString());
    }

    [Fact]
    public async Task Criar_SemListaDeConvidados_DeveRetornar400()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamentoId), new { nome = "Família" });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.True(json.RootElement.GetProperty("errors").TryGetProperty("Convidados", out _));
    }

    [Theory]
    [InlineData("\"Idoso\"")]
    [InlineData("7")]
    public async Task Criar_ComFaixaEtariaInvalida_DeveRetornar400(string valorJson)
    {
        var casamentoId = await CriarCasamentoAsync();
        using var conteudo = new StringContent(
            $$"""{"convidados":[{"nome":"Ana","faixaEtaria":{{valorJson}}}]}""",
            System.Text.Encoding.UTF8,
            "application/json");

        var resposta = await OrganizacaoA.Cliente.PostAsync(Rota(casamentoId), conteudo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_ComMaisDe30Convidados_DeveRetornar400()
    {
        var casamentoId = await CriarCasamentoAsync();
        var pessoas = Enumerable.Range(1, 31).Select(indice => Pessoa($"Pessoa {indice}", null, null)).ToArray();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamentoId), CorpoValido("Grande", null, 0, pessoas));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Convites.AnyAsync(convite => convite.CasamentoId == casamentoId));
    }

    [Fact]
    public async Task EscritaEmCasamentoArquivado_DeveRetornar422ELeituraContinuaLiberada()
    {
        var casamentoId = await CriarCasamentoAsync();
        var convite = await CriarAsync(OrganizacaoA.Cliente, casamentoId);
        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamentoId}/arquivar", null);

        var criar = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamentoId), CorpoValido());
        var atualizar = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(casamentoId, convite.Id), CorpoValido(nome: "Alterado"));
        var remover = await OrganizacaoA.Cliente.DeleteAsync(Rota(casamentoId, convite.Id));

        foreach (var resposta in new[] { criar, atualizar, remover })
        {
            Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
            using var json = await LerJsonAsync(resposta);
            Assert.Equal(MensagensConvidados.CasamentoArquivado, json.RootElement.GetProperty("detail").GetString());
        }

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamentoId);
        Assert.True(lista.CasamentoArquivado);
        Assert.Equal("Família Souza", Assert.Single(lista.Convites).Nome);
    }

    [Fact]
    public async Task Remover_DeveExcluirConviteEConvidados()
    {
        var casamentoId = await CriarCasamentoAsync();
        var convite = await CriarAsync(OrganizacaoA.Cliente, casamentoId);

        var resposta = await OrganizacaoA.Cliente.DeleteAsync(Rota(casamentoId, convite.Id));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.GetAsync(Rota(casamentoId, convite.Id))).StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Convidados.AnyAsync(convidado => convidado.ConviteId == convite.Id));
        Assert.Equal(0, (await ListarAsync(OrganizacaoA.Cliente, casamentoId)).Totais.Pessoas);
    }

    [Fact]
    public async Task ConviteDeOutroCasamentoDaMesmaOrganizacao_DeveRetornar404()
    {
        var casamentoUm = await CriarCasamentoAsync();
        var casamentoDois = await CriarCasamentoAsync();
        var convite = await CriarAsync(OrganizacaoA.Cliente, casamentoUm);

        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.GetAsync(Rota(casamentoDois, convite.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.DeleteAsync(Rota(casamentoDois, convite.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.GetAsync(Rota(casamentoUm, convite.Id))).StatusCode);
    }

    [Fact]
    public async Task CasamentoInexistente_DeveRetornar404()
    {
        var resposta = await OrganizacaoA.Cliente.GetAsync(Rota(Guid.NewGuid()));

        await AssertNaoEncontradoAsync(resposta);
    }

    [Fact]
    public async Task SemToken_DeveRetornar401()
    {
        var casamentoId = await CriarCasamentoAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(Rota(casamentoId))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsJsonAsync(Rota(casamentoId), CorpoValido())).StatusCode);
    }
}
