using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Convidados;
using Celebri.Dominio.Convidados;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Convidados;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ConvitesApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ConvitesApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private async Task<Guid> CriarEventoAsync(HttpClient? cliente = null, int? convidadosEstimados = 150)
    {
        var evento = await ClienteEventos.CriarAsync(
            cliente ?? OrganizacaoA.Cliente,
            ClienteEventos.CorpoValido(convidadosEstimados: convidadosEstimados));
        return evento.Id;
    }

    private static async Task<JsonDocument> LerJsonAsync(HttpResponseMessage resposta)
    {
        return JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Criar_DadosValidos_DeveRetornar201NormalizadoComPadroesESemOrganizacao()
    {
        var eventoId = await CriarEventoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(eventoId), CorpoValido(grupo: "  Família   da noiva "));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var json = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", json, StringComparison.OrdinalIgnoreCase);
        var convite = JsonSerializer.Deserialize<ConviteDto>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal($"/api/eventos/{eventoId}/convites/{convite.Id}", resposta.Headers.Location!.AbsolutePath);
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
    public async Task Criar_DevePersistirConviteEConvidadosNaOrganizacaoEEventoCorretos()
    {
        var eventoId = await CriarEventoAsync();

        var convite = await CriarAsync(OrganizacaoA.Cliente, eventoId);

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.Convites.Include(item => item.Convidados).SingleAsync(item => item.Id == convite.Id);
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravado.OrganizacaoId);
        Assert.Equal(eventoId, gravado.EventoId);
        Assert.All(gravado.Convidados, convidado =>
        {
            Assert.Equal(OrganizacaoA.OrganizacaoId, convidado.OrganizacaoId);
            Assert.Equal(eventoId, convidado.EventoId);
            Assert.Equal(convite.Id, convidado.ConviteId);
        });
    }

    [Fact]
    public async Task Criar_SemNome_DeveUsarNomeDoPrimeiroConvidado()
    {
        var eventoId = await CriarEventoAsync();

        var convite = await CriarAsync(OrganizacaoA.Cliente, eventoId, CorpoValido(nome: "  ", grupo: null, limiteAcompanhantes: null, Pessoa("Ana Lima")));

        Assert.Equal("Ana Lima", convite.Nome);
        Assert.Null(convite.Grupo);
        Assert.Equal(0, convite.LimiteAcompanhantes);
    }

    [Fact]
    public async Task Listar_DeveRetornarConvitesOrdenadosTotaisEstimativa()
    {
        var eventoId = await CriarEventoAsync(convidadosEstimados: 150);
        await CriarAsync(OrganizacaoA.Cliente, eventoId, CorpoValido("Zélia e família", null, 1,
            Pessoa("Zélia", resposta: "Confirmado"),
            Pessoa("Rui", resposta: "Confirmado"),
            Pessoa("Téo", faixaEtaria: "Crianca", resposta: "Confirmado")));
        await CriarAsync(OrganizacaoA.Cliente, eventoId, CorpoValido("álvaro", null, 0,
            Pessoa("Álvaro", resposta: "Confirmado"),
            Pessoa("Bia", resposta: "Pendente")));
        await CriarAsync(OrganizacaoA.Cliente, eventoId, CorpoValido("Beto", null, 2,
            Pessoa("Beto", resposta: "Pendente"),
            Pessoa("Lia", faixaEtaria: "Crianca", resposta: "Recusado")));

        var lista = await ListarAsync(OrganizacaoA.Cliente, eventoId);

        Assert.Equal(["álvaro", "Beto", "Zélia e família"], lista.Convites.Select(convite => convite.Nome));
        Assert.Equal(150, lista.ConvidadosEstimados);
        Assert.False(lista.EventoArquivado);
        var totais = lista.Totais;
        Assert.Equal(3, totais.Convites);
        Assert.Equal(7, totais.Pessoas);
        Assert.Equal(5, totais.Adultos);
        Assert.Equal(2, totais.Criancas);
        Assert.Equal(3, totais.AcompanhantesPermitidos);
        Assert.Equal(new TotaisPorFaixaDto(3, 1, 4), totais.Confirmados);
        Assert.Equal(new TotaisPorFaixaDto(2, 0, 2), totais.Pendentes);
        Assert.Equal(new TotaisPorFaixaDto(0, 1, 1), totais.Recusados);

        var totaisDiretos = await OrganizacaoA.Cliente.GetFromJsonAsync<TotaisConvidadosDto>($"{Rota(eventoId)}/totais");
        Assert.Equal(totais, totaisDiretos);
    }

    [Fact]
    public async Task Listar_EventoSemConvites_DeveRetornarTotaisZerados()
    {
        var eventoId = await CriarEventoAsync(convidadosEstimados: null);

        var lista = await ListarAsync(OrganizacaoA.Cliente, eventoId);
        var totais = await OrganizacaoA.Cliente.GetFromJsonAsync<TotaisConvidadosDto>($"{Rota(eventoId)}/totais");

        Assert.Empty(lista.Convites);
        Assert.Null(lista.ConvidadosEstimados);
        Assert.Equal(0, lista.Totais.Pessoas);
        Assert.Equal(lista.Totais, totais);
    }

    [Fact]
    public async Task Obter_DeveRetornarConvite()
    {
        var eventoId = await CriarEventoAsync();
        var criado = await CriarAsync(OrganizacaoA.Cliente, eventoId);

        var obtido = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(eventoId, criado.Id));

        Assert.Equal(criado.Id, obtido!.Id);
        Assert.Equal(2, obtido.Convidados.Count);
    }

    [Fact]
    public async Task Atualizar_DeveSincronizarConvidadosPorIdEOrdem()
    {
        var eventoId = await CriarEventoAsync();
        var criado = await CriarAsync(OrganizacaoA.Cliente, eventoId, CorpoValido("Família Lima", null, 0,
            Pessoa("Ana"), Pessoa("Bruno"), Pessoa("Caio")));
        var ana = criado.Convidados[0];
        var caio = criado.Convidados[2];

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(eventoId, criado.Id), CorpoValido("Família Lima", "Amigos", 2,
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
        var eventoId = await CriarEventoAsync();
        var primeiro = await CriarAsync(OrganizacaoA.Cliente, eventoId);
        var segundo = await CriarAsync(OrganizacaoA.Cliente, eventoId, CorpoValido("Outro", null, 0, Pessoa("Rita")));

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(eventoId, primeiro.Id), CorpoValido("Família Souza", null, 0,
            Pessoa("Rita roubada", id: segundo.Convidados[0].Id)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.Equal(MensagensConvidados.ConvidadoDeOutroConvite, json.RootElement.GetProperty("detail").GetString());
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(eventoId, segundo.Id));
        Assert.Equal("Rita", atual!.Convidados[0].Nome);
        var primeiroAtual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(eventoId, primeiro.Id));
        Assert.Equal(2, primeiroAtual!.Convidados.Count);
    }

    [Fact]
    public async Task Atualizar_SemConvidados_DeveRetornar400ENaoAlterar()
    {
        var eventoId = await CriarEventoAsync();
        var criado = await CriarAsync(OrganizacaoA.Cliente, eventoId);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(eventoId, criado.Id), new { nome = "X", convidados = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(Rota(eventoId, criado.Id));
        Assert.Equal(2, atual!.Convidados.Count);
    }

    [Fact]
    public async Task Criar_ComTelefoneEEmailInvalidos_DeveRetornar400PorCampo()
    {
        var eventoId = await CriarEventoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(eventoId), CorpoValido("Família", null, 0,
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
        var eventoId = await CriarEventoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(eventoId), new
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
        var eventoId = await CriarEventoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(eventoId), new { nome = "Família" });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.True(json.RootElement.GetProperty("errors").TryGetProperty("Convidados", out _));
    }

    [Theory]
    [InlineData("\"Idoso\"")]
    [InlineData("7")]
    public async Task Criar_ComFaixaEtariaInvalida_DeveRetornar400(string valorJson)
    {
        var eventoId = await CriarEventoAsync();
        using var conteudo = new StringContent(
            $$"""{"convidados":[{"nome":"Ana","faixaEtaria":{{valorJson}}}]}""",
            System.Text.Encoding.UTF8,
            "application/json");

        var resposta = await OrganizacaoA.Cliente.PostAsync(Rota(eventoId), conteudo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_ComMaisDe30Convidados_DeveRetornar400()
    {
        var eventoId = await CriarEventoAsync();
        var pessoas = Enumerable.Range(1, 31).Select(indice => Pessoa($"Pessoa {indice}", null, null)).ToArray();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(eventoId), CorpoValido("Grande", null, 0, pessoas));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Convites.AnyAsync(convite => convite.EventoId == eventoId));
    }

    [Fact]
    public async Task EscritaEmEventoArquivado_DeveRetornar422ELeituraContinuaLiberada()
    {
        var eventoId = await CriarEventoAsync();
        var convite = await CriarAsync(OrganizacaoA.Cliente, eventoId);
        await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{eventoId}/arquivar", null);

        var criar = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(eventoId), CorpoValido());
        var atualizar = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(eventoId, convite.Id), CorpoValido(nome: "Alterado"));
        var remover = await OrganizacaoA.Cliente.DeleteAsync(Rota(eventoId, convite.Id));

        foreach (var resposta in new[] { criar, atualizar, remover })
        {
            Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
            using var json = await LerJsonAsync(resposta);
            Assert.Equal(MensagensConvidados.EventoArquivado, json.RootElement.GetProperty("detail").GetString());
        }

        var lista = await ListarAsync(OrganizacaoA.Cliente, eventoId);
        Assert.True(lista.EventoArquivado);
        Assert.Equal("Família Souza", Assert.Single(lista.Convites).Nome);
    }

    [Fact]
    public async Task Remover_DeveExcluirConviteEConvidados()
    {
        var eventoId = await CriarEventoAsync();
        var convite = await CriarAsync(OrganizacaoA.Cliente, eventoId);

        var resposta = await OrganizacaoA.Cliente.DeleteAsync(Rota(eventoId, convite.Id));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.GetAsync(Rota(eventoId, convite.Id))).StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Convidados.AnyAsync(convidado => convidado.ConviteId == convite.Id));
        Assert.Equal(0, (await ListarAsync(OrganizacaoA.Cliente, eventoId)).Totais.Pessoas);
    }

    [Fact]
    public async Task ConviteDeOutroEventoDaMesmaOrganizacao_DeveRetornar404()
    {
        var eventoUm = await CriarEventoAsync();
        var eventoDois = await CriarEventoAsync();
        var convite = await CriarAsync(OrganizacaoA.Cliente, eventoUm);

        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.GetAsync(Rota(eventoDois, convite.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.DeleteAsync(Rota(eventoDois, convite.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.GetAsync(Rota(eventoUm, convite.Id))).StatusCode);
    }

    [Fact]
    public async Task EventoInexistente_DeveRetornar404()
    {
        var resposta = await OrganizacaoA.Cliente.GetAsync(Rota(Guid.NewGuid()));

        await AssertNaoEncontradoAsync(resposta);
    }

    [Fact]
    public async Task SemToken_DeveRetornar401()
    {
        var eventoId = await CriarEventoAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(Rota(eventoId))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsJsonAsync(Rota(eventoId), CorpoValido())).StatusCode);
    }
}
