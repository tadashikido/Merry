using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Rsvp;
using Celebri.Dominio.DadosSensiveis;
using Celebri.Infraestrutura.Seguranca;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using static Celebri.Testes.Integracao.Rsvp.ClienteRsvp;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.DadosSensiveis;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class DadosSensiveisApiTestes : IsolamentoOrganizacaoTestesBase
{
    private const string TextoOutra = "Não come carne de porco";
    private const string TextoNecessidade = "Cadeira de rodas, mesa perto da saída";

    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    public DadosSensiveisApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static object Consentimento(bool aceito = true, string? versao = TermoPrivacidadeRsvp.VersaoVigente)
    {
        return new { aceito, versaoTermo = versao };
    }

    private static object Restricao(string[]? tipos = null, string? outra = null, string? necessidade = null)
    {
        return new { tipos = tipos ?? [], outraRestricao = outra, necessidadeEspecial = necessidade };
    }

    private static string RotaRelatorio(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/restricoes-alimentares";
    }

    private static string RotaRestricao(Guid eventoId, Guid conviteId, Guid convidadoId)
    {
        return $"{ClienteConvites.Rota(eventoId, conviteId)}/convidados/{convidadoId}/restricao-alimentar";
    }

    private async Task<(EventoDto Evento, ConviteDto Convite, string Token)> CriarConviteComLinkAsync(
        OrganizacaoTeste organizacao,
        string data = "2027-05-15",
        int limiteAcompanhantes = 1)
    {
        var evento = await ClienteEventos.CriarAsync(organizacao.Cliente, ClienteEventos.CorpoValido(data: data));
        var convite = await ClienteConvites.CriarAsync(
            organizacao.Cliente,
            evento.Id,
            ClienteConvites.CorpoValido(
                "Família Souza",
                "Família da noiva",
                limiteAcompanhantes,
                ClienteConvites.Pessoa("Célia Souza"),
                ClienteConvites.Pessoa("Lia Souza", telefone: null, email: null, faixaEtaria: "Crianca")));
        var link = await GerarLinkAsync(organizacao.Cliente, evento.Id, convite.Id);
        return (evento, convite, link.Token);
    }

    private static Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string token, object[] pessoas, object[]? acompanhantes = null, object? consentimento = null)
    {
        return cliente.PutAsJsonAsync(RotaResposta, new { token, pessoas, acompanhantes = acompanhantes ?? [], consentimento });
    }

    private static async Task<RsvpPublicoDto> LerRsvpAsync(HttpResponseMessage resposta)
    {
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<RsvpPublicoDto>(OpcoesJson))!;
    }

    private static async Task<string?> LerDetalheAsync(HttpResponseMessage resposta)
    {
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        return json.RootElement.TryGetProperty("detail", out var detalhe) ? detalhe.GetString() : null;
    }

    private async Task<List<DadosSensiveisConvidado>> ListarRegistrosAsync(OrganizacaoTeste organizacao)
    {
        await using var contexto = CriarContexto(organizacao);
        return await contexto.DadosSensiveisConvidados.AsNoTracking().ToListAsync();
    }

    private async Task<RelatorioRestricoesAlimentaresDto> ObterRelatorioAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(RotaRelatorio(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<RelatorioRestricoesAlimentaresDto>(OpcoesJson))!;
    }

    private ExecutorRetencaoDadosSensiveis CriarExecutor(DateOnly hoje, ILogger<ExecutorRetencaoDadosSensiveis> logs)
    {
        return new ExecutorRetencaoDadosSensiveis(
            Fabrica.Services.GetRequiredService<IServiceScopeFactory>(),
            new CalendarioFixo(hoje),
            TimeProvider.System,
            Options.Create(new OpcoesRetencaoDadosSensiveis()),
            logs);
    }

    [Fact]
    public async Task Responder_ComRestricaoEConsentimento_DeveCifrarEExporSoIndicador()
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var (celia, lia) = (convite.Convidados[0], convite.Convidados[1]);

        var dto = await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            token,
            [
                new { id = celia.Id, resposta = "Confirmado" },
                new { id = lia.Id, resposta = "Confirmado", restricao = Restricao(["SemGluten"], TextoOutra, TextoNecessidade) },
            ],
            consentimento: Consentimento()));

        Assert.False(dto.Pessoas.Single(pessoa => pessoa.Id == celia.Id).PossuiRestricao);
        Assert.True(dto.Pessoas.Single(pessoa => pessoa.Id == lia.Id).PossuiRestricao);
        Assert.Equal(TermoPrivacidadeRsvp.VersaoVigente, dto.Privacidade.VersaoTermo);
        Assert.Equal(30, dto.Privacidade.DiasRetencao);

        var registro = Assert.Single(await ListarRegistrosAsync(OrganizacaoA));
        Assert.Equal(lia.Id, registro.ConvidadoId);
        Assert.StartsWith(CifradorDadosSensiveis.PrefixoVersao, registro.ConteudoCifrado, StringComparison.Ordinal);
        Assert.Equal(TermoPrivacidadeRsvp.VersaoVigente, registro.VersaoTermo);
        Assert.Equal(OrigemConsentimento.Convidado, registro.OrigemConsentimento);
        Assert.Null(registro.RegistradoPorUsuarioId);
        Assert.Equal(OrganizacaoA.OrganizacaoId, registro.OrganizacaoId);

        var textoPlano = JsonSerializer.Serialize(registro);
        Assert.DoesNotContain("SemGluten", textoPlano, StringComparison.Ordinal);
        Assert.DoesNotContain("porco", textoPlano, StringComparison.Ordinal);
        Assert.DoesNotContain("rodas", textoPlano, StringComparison.Ordinal);

        var consulta = await (await ConsultarAsync(ClienteAnonimo, token)).Content.ReadAsStringAsync();
        Assert.DoesNotContain("SemGluten", consulta, StringComparison.Ordinal);
        Assert.DoesNotContain("porco", consulta, StringComparison.Ordinal);
        Assert.DoesNotContain("rodas", consulta, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(false)]
    public async Task Responder_ComRestricaoSemConsentimento_Deve422SemGravarNada(bool? aceito)
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var resposta = await EnviarAsync(
            ClienteAnonimo,
            token,
            [
                new { id = convite.Convidados[0].Id, resposta = "Confirmado", restricao = Restricao(["Vegana"]) },
                new { id = convite.Convidados[1].Id, resposta = "Recusado" },
            ],
            consentimento: aceito is null ? null : Consentimento(aceito.Value));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensDadosSensiveis.ConsentimentoObrigatorio, await LerDetalheAsync(resposta));
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));

        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        var gravado = Assert.Single(lista.Convites);
        Assert.Null(gravado.RespondidoEm);
        Assert.All(gravado.Convidados, pessoa => Assert.Equal("Pendente", pessoa.Resposta));
    }

    [Fact]
    public async Task Responder_VersaoDoTermoAntiga_Deve422ComOrientacao()
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var resposta = await EnviarAsync(
            ClienteAnonimo,
            token,
            [
                new { id = convite.Convidados[0].Id, resposta = "Confirmado", restricao = Restricao(["Vegana"]) },
                new { id = convite.Convidados[1].Id, resposta = "Confirmado" },
            ],
            consentimento: Consentimento(true, "2020-01-01"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensDadosSensiveis.TermoDesatualizado, await LerDetalheAsync(resposta));
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Fact]
    public async Task Responder_SemRestricao_NaoExigeConsentimento()
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var dto = await LerRsvpAsync(await ResponderAsync(ClienteAnonimo, token, convite.Convidados.Select(pessoa => (pessoa.Id, "Confirmado"))));

        Assert.All(dto.Pessoas, pessoa => Assert.False(pessoa.PossuiRestricao));
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Theory]
    [InlineData("[\"Carnivora\"]")]
    [InlineData("[\"1\"]")]
    [InlineData("[\"SemGluten\",\"Vegana\",\"Vegetariana\",\"SemLactose\",\"AlergiaFrutosDoMar\",\"AlergiaAmendoimCastanhas\",\"SemGluten\"]")]
    public async Task Responder_TiposInvalidos_Deve400(string tiposJson)
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var corpo = string.Concat(
            "{\"token\":\"", token,
            "\",\"pessoas\":[{\"id\":\"", convite.Convidados[0].Id.ToString(),
            "\",\"resposta\":\"Confirmado\",\"restricao\":{\"tipos\":", tiposJson,
            "}},{\"id\":\"", convite.Convidados[1].Id.ToString(),
            "\",\"resposta\":\"Confirmado\"}],\"acompanhantes\":[],\"consentimento\":{\"aceito\":true,\"versaoTermo\":\"",
            TermoPrivacidadeRsvp.VersaoVigente,
            "\"}}");

        var resposta = await ClienteAnonimo.PutAsync(RotaResposta, new StringContent(corpo, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Fact]
    public async Task Responder_TextoLongoDepoisDeNormalizar_Deve422()
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var resposta = await EnviarAsync(
            ClienteAnonimo,
            token,
            [
                new { id = convite.Convidados[0].Id, resposta = "Confirmado", restricao = Restricao(outra: new string('x', 81)) },
                new { id = convite.Convidados[1].Id, resposta = "Confirmado" },
            ],
            consentimento: Consentimento());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensDadosSensiveis.TamanhoOutraRestricao, await LerDetalheAsync(resposta));
    }

    [Fact]
    public async Task Responder_Ausente_Mantem_Recusado_Apaga_Vazio_Remove()
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var (celia, lia) = (convite.Convidados[0], convite.Convidados[1]);
        await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            token,
            [
                new { id = celia.Id, resposta = "Confirmado", restricao = Restricao(["Vegana"]) },
                new { id = lia.Id, resposta = "Confirmado", restricao = Restricao(["SemGluten"]) },
            ],
            consentimento: Consentimento()));
        var consentidoCelia = (await ListarRegistrosAsync(OrganizacaoA)).Single(registro => registro.ConvidadoId == celia.Id).ConsentidoEm;

        var dto = await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            token,
            [new { id = celia.Id, resposta = "Confirmado" }, new { id = lia.Id, resposta = "Recusado" }]));

        Assert.True(dto.Pessoas.Single(pessoa => pessoa.Id == celia.Id).PossuiRestricao);
        Assert.False(dto.Pessoas.Single(pessoa => pessoa.Id == lia.Id).PossuiRestricao);
        var registro = Assert.Single(await ListarRegistrosAsync(OrganizacaoA));
        Assert.Equal(celia.Id, registro.ConvidadoId);
        Assert.Equal(consentidoCelia, registro.ConsentidoEm);

        await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            token,
            [new { id = celia.Id, resposta = "Confirmado", restricao = Restricao() }, new { id = lia.Id, resposta = "Recusado" }]));

        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Fact]
    public async Task Responder_AcompanhanteComRestricao_DeveGravarEApagarQuandoRemovido()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var pessoas = convite.Convidados.Select(pessoa => (object)new { id = pessoa.Id, resposta = "Confirmado" }).ToArray();

        var dto = await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            token,
            pessoas,
            [new { nome = "Pedro Lima", faixaEtaria = "Adulto", restricao = Restricao(necessidade: TextoNecessidade) }],
            Consentimento()));

        var pedro = Assert.Single(dto.Acompanhantes);
        Assert.True(pedro.PossuiRestricao);
        Assert.Equal(pedro.Id, Assert.Single(await ListarRegistrosAsync(OrganizacaoA)).ConvidadoId);

        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(lista.Convites.Single().Convidados.Single(pessoa => pessoa.Acompanhante).PossuiRestricao);
        Assert.DoesNotContain("rodas", JsonSerializer.Serialize(lista), StringComparison.Ordinal);

        await LerRsvpAsync(await EnviarAsync(ClienteAnonimo, token, pessoas));

        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Fact]
    public async Task Relatorio_DeveAgregarConfirmadosETrazerListaSemContato()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA, limiteAcompanhantes: 2);
        var (celia, lia) = (convite.Convidados[0], convite.Convidados[1]);
        await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            token,
            [
                new { id = celia.Id, resposta = "Confirmado", restricao = Restricao(["SemGluten"]) },
                new { id = lia.Id, resposta = "Confirmado", restricao = Restricao(["SemGluten", "SemLactose"], TextoOutra) },
            ],
            [new { nome = "Pedro Lima", faixaEtaria = "Adulto", restricao = Restricao(["Vegana"], necessidade: TextoNecessidade) }],
            Consentimento()));
        var outro = await ClienteConvites.CriarAsync(
            OrganizacaoA.Cliente,
            evento.Id,
            ClienteConvites.CorpoValido("Família Lima", null, 0, ClienteConvites.Pessoa("Rui Lima", telefone: "(21) 99999-0000")));
        var registrar = await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaRestricao(evento.Id, outro.Id, outro.Convidados[0].Id),
            new { tipos = new[] { "Vegetariana" }, consentimentoObtido = true });
        Assert.Equal(HttpStatusCode.OK, registrar.StatusCode);

        var resposta = await OrganizacaoA.Cliente.GetAsync(RotaRelatorio(evento.Id));
        var corpo = await resposta.Content.ReadAsStringAsync();
        var relatorio = JsonSerializer.Deserialize<RelatorioRestricoesAlimentaresDto>(corpo, OpcoesJson)!;

        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal(4, relatorio.TotalPessoas);
        Assert.Equal(3, relatorio.TotalConfirmados);
        Assert.Equal(2, relatorio.PorTipo.Single(contagem => contagem.Tipo == "SemGluten").Quantidade);
        Assert.Equal(1, relatorio.PorTipo.Single(contagem => contagem.Tipo == "SemLactose").Quantidade);
        Assert.Equal(1, relatorio.PorTipo.Single(contagem => contagem.Tipo == "Vegana").Quantidade);
        Assert.DoesNotContain(relatorio.PorTipo, contagem => contagem.Tipo == "Vegetariana");
        Assert.Equal(1, relatorio.OutrasRestricoes);
        Assert.Equal(1, relatorio.NecessidadesEspeciais);
        Assert.Equal(new DateOnly(2027, 6, 14), relatorio.DataExclusaoPrevista);
        Assert.Equal(30, relatorio.DiasRetencao);
        Assert.Null(relatorio.DadosExcluidosEm);
        Assert.True(relatorio.PodeRegistrar);

        var rui = relatorio.Pessoas.Single(pessoa => pessoa.Nome == "Rui Lima");
        Assert.Equal("Pendente", rui.Resposta);
        Assert.Equal("Cerimonialista", rui.OrigemConsentimento);
        var pedro = relatorio.Pessoas.Single(pessoa => pessoa.Nome == "Pedro Lima");
        Assert.True(pedro.Acompanhante);
        Assert.Equal(TextoNecessidade, pedro.NecessidadeEspecial);
        Assert.Equal(TextoOutra, relatorio.Pessoas.Single(pessoa => pessoa.ConvidadoId == lia.Id).OutraRestricao);

        Assert.DoesNotContain("98765", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain("99999", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain("exemplo.com", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("telefone", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("email", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Família da noiva", corpo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Relatorio_PessoaQueRecusou_NaoAparece()
    {
        var (evento, convite, _) = await CriarConviteComLinkAsync(OrganizacaoA);
        await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaRestricao(evento.Id, convite.Id, convite.Convidados[0].Id),
            new { tipos = new[] { "Vegana" }, consentimentoObtido = true });
        await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        var atualizado = await OrganizacaoA.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(evento.Id, convite.Id),
            ClienteConvites.CorpoValido(
                "Família Souza",
                null,
                1,
                ClienteConvites.Pessoa("Célia Souza", resposta: "Recusado", id: convite.Convidados[0].Id),
                ClienteConvites.Pessoa("Lia Souza", telefone: null, email: null, id: convite.Convidados[1].Id)));
        Assert.Equal(HttpStatusCode.OK, atualizado.StatusCode);

        var relatorio = await ObterRelatorioAsync(OrganizacaoA.Cliente, evento.Id);

        Assert.Empty(relatorio.Pessoas);
        Assert.Equal(0, relatorio.TotalPessoas);
    }

    [Fact]
    public async Task Cerimonialista_SemDeclaracaoDeConsentimento_Deve422()
    {
        var (evento, convite, _) = await CriarConviteComLinkAsync(OrganizacaoA);
        var rota = RotaRestricao(evento.Id, convite.Id, convite.Convidados[0].Id);

        var semDeclaracao = await OrganizacaoA.Cliente.PutAsJsonAsync(rota, new { tipos = new[] { "Vegana" }, consentimentoObtido = false });
        var semCampo = await OrganizacaoA.Cliente.PutAsJsonAsync(rota, new { tipos = new[] { "Vegana" } });
        var vazio = await OrganizacaoA.Cliente.PutAsJsonAsync(rota, new { tipos = Array.Empty<string>(), consentimentoObtido = true });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, semDeclaracao.StatusCode);
        Assert.Equal(MensagensDadosSensiveis.ConsentimentoObtidoObrigatorio, await LerDetalheAsync(semDeclaracao));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, semCampo.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, vazio.StatusCode);
        Assert.Equal(MensagensDadosSensiveis.ConteudoObrigatorio, await LerDetalheAsync(vazio));
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Fact]
    public async Task Cerimonialista_ComDeclaracao_DeveGravarOrigemEUsuarioERemover()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var rota = RotaRestricao(evento.Id, convite.Id, convite.Convidados[1].Id);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            rota,
            new { tipos = new[] { "AlergiaAmendoimCastanhas" }, outraRestricao = "  sem   nozes ", consentimentoObtido = true });
        var dto = (await resposta.Content.ReadFromJsonAsync<RestricaoAlimentarDto>(OpcoesJson))!;

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Equal(["AlergiaAmendoimCastanhas"], dto.Tipos);
        Assert.Equal("sem nozes", dto.OutraRestricao);
        Assert.Equal("Cerimonialista", dto.OrigemConsentimento);
        var registro = Assert.Single(await ListarRegistrosAsync(OrganizacaoA));
        Assert.Equal(OrigemConsentimento.Cerimonialista, registro.OrigemConsentimento);
        Assert.Equal(OrganizacaoA.UsuarioId, registro.RegistradoPorUsuarioId);

        var consulta = await ConsultarComSucessoAsync(ClienteAnonimo, token);
        Assert.True(consulta.Pessoas.Single(pessoa => pessoa.Id == convite.Convidados[1].Id).PossuiRestricao);

        var remocao = await OrganizacaoA.Cliente.DeleteAsync(rota);

        Assert.Equal(HttpStatusCode.NoContent, remocao.StatusCode);
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoA));
    }

    [Fact]
    public async Task Cerimonialista_PessoaDeOutroConvite_Deve404()
    {
        var (evento, convite, _) = await CriarConviteComLinkAsync(OrganizacaoA);
        var outro = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteConvites.CorpoValido("Outro", null, 0, ClienteConvites.Pessoa("Rui")));

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaRestricao(evento.Id, convite.Id, outro.Convidados[0].Id),
            new { tipos = new[] { "Vegana" }, consentimentoObtido = true });

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
    }

    [Fact]
    public async Task Cerimonialista_EventoComRetencaoEncerrada_Deve422()
    {
        var dataPassada = ClienteEventos.HojeEmSaoPaulo().AddDays(-40).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente, ClienteEventos.CorpoValido(data: dataPassada));
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaRestricao(evento.Id, convite.Id, convite.Convidados[0].Id),
            new { tipos = new[] { "Vegana" }, consentimentoObtido = true });
        var relatorio = await ObterRelatorioAsync(OrganizacaoA.Cliente, evento.Id);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensDadosSensiveis.RetencaoEncerrada, await LerDetalheAsync(resposta));
        Assert.False(relatorio.PodeRegistrar);
    }

    [Fact]
    public async Task Isolamento_OutraOrganizacao_Deve404ESemAlterarDados()
    {
        var (evento, convite, _) = await CriarConviteComLinkAsync(OrganizacaoA);
        var rota = RotaRestricao(evento.Id, convite.Id, convite.Convidados[0].Id);
        await OrganizacaoA.Cliente.PutAsJsonAsync(rota, new { tipos = new[] { "Vegana" }, consentimentoObtido = true });

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaRelatorio(evento.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(rota, new { tipos = new[] { "SemGluten" }, consentimentoObtido = true }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(rota));

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaRelatorio(evento.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.DeleteAsync(rota)).StatusCode);

        var relatorio = await ObterRelatorioAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.Equal(["Vegana"], Assert.Single(relatorio.Pessoas).Tipos);
        Assert.Empty(await ListarRegistrosAsync(OrganizacaoB));
    }

    [Fact]
    public async Task Retencao_DeveAnonimizarSoVencidosSerIdempotenteELogarSoContagem()
    {
        var (eventoVencido, conviteVencido, tokenVencido) = await CriarConviteComLinkAsync(OrganizacaoA, "2027-05-15");
        var (eventoVigente, conviteVigente, _) = await CriarConviteComLinkAsync(OrganizacaoB, "2027-06-10");
        await LerRsvpAsync(await EnviarAsync(
            ClienteAnonimo,
            tokenVencido,
            [
                new { id = conviteVencido.Convidados[0].Id, resposta = "Confirmado", restricao = Restricao(["SemGluten"], TextoOutra) },
                new { id = conviteVencido.Convidados[1].Id, resposta = "Confirmado", restricao = Restricao(necessidade: TextoNecessidade) },
            ],
            consentimento: Consentimento()));
        await OrganizacaoB.Cliente.PutAsJsonAsync(
            RotaRestricao(eventoVigente.Id, conviteVigente.Id, conviteVigente.Convidados[0].Id),
            new { tipos = new[] { "Vegana" }, consentimentoObtido = true });
        var logs = new RegistroLogsIntegracao<ExecutorRetencaoDadosSensiveis>();
        var executor = CriarExecutor(new DateOnly(2027, 6, 20), logs);

        var primeira = await executor.ExecutarAsync(CancellationToken.None);
        var segunda = await executor.ExecutarAsync(CancellationToken.None);

        Assert.Equal(2, primeira);
        Assert.Equal(0, segunda);
        var vencidos = await ListarRegistrosAsync(OrganizacaoA);
        Assert.Equal(2, vencidos.Count);
        Assert.All(vencidos, registro =>
        {
            Assert.Null(registro.ConteudoCifrado);
            Assert.NotNull(registro.ExcluidoEm);
            Assert.Equal(TermoPrivacidadeRsvp.VersaoVigente, registro.VersaoTermo);
        });
        Assert.NotNull(Assert.Single(await ListarRegistrosAsync(OrganizacaoB)).ConteudoCifrado);

        Assert.Equal(2, logs.Mensagens.Count);
        Assert.Contains("2 registros anonimizados em 2 organizações", logs.Mensagens[0], StringComparison.Ordinal);
        Assert.Contains("0 registros anonimizados", logs.Mensagens[1], StringComparison.Ordinal);
        Assert.All(logs.Mensagens, mensagem =>
        {
            Assert.DoesNotContain("SemGluten", mensagem, StringComparison.Ordinal);
            Assert.DoesNotContain("porco", mensagem, StringComparison.Ordinal);
            Assert.DoesNotContain("rodas", mensagem, StringComparison.Ordinal);
        });

        var relatorio = await ObterRelatorioAsync(OrganizacaoA.Cliente, eventoVencido.Id);
        Assert.Empty(relatorio.Pessoas);
        Assert.NotNull(relatorio.DadosExcluidosEm);
        var consulta = await ConsultarComSucessoAsync(ClienteAnonimo, tokenVencido);
        Assert.All(consulta.Pessoas, pessoa => Assert.False(pessoa.PossuiRestricao));
    }

    [Fact]
    public async Task Retencao_NoLimiteDoPrazo_NaoDeveAnonimizar()
    {
        var (evento, convite, _) = await CriarConviteComLinkAsync(OrganizacaoA, "2027-05-15");
        await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaRestricao(evento.Id, convite.Id, convite.Convidados[0].Id),
            new { tipos = new[] { "Vegana" }, consentimentoObtido = true });

        var anonimizados = await CriarExecutor(new DateOnly(2027, 6, 14), new RegistroLogsIntegracao<ExecutorRetencaoDadosSensiveis>())
            .ExecutarAsync(CancellationToken.None);

        Assert.Equal(0, anonimizados);
        Assert.NotNull(Assert.Single(await ListarRegistrosAsync(OrganizacaoA)).ConteudoCifrado);
    }

    [Fact]
    public async Task Logs_DaApi_NaoDevemConterConteudoSensivel()
    {
        var provedor = new ProvedorLogsMemoria();
        await using var fabricaComLogs = Fabrica.WithWebHostBuilder(builder => builder.ConfigureLogging(logging =>
        {
            logging.SetMinimumLevel(LogLevel.Trace);
            logging.AddProvider(provedor);
        }));
        using var anonimo = fabricaComLogs.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var autenticado = fabricaComLogs.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        autenticado.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", OrganizacaoA.TokenAcesso);
        autenticado.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        await LerRsvpAsync(await EnviarAsync(
            anonimo,
            token,
            [
                new { id = convite.Convidados[0].Id, resposta = "Confirmado", restricao = Restricao(["SemGluten"], TextoOutra, TextoNecessidade) },
                new { id = convite.Convidados[1].Id, resposta = "Confirmado" },
            ],
            consentimento: Consentimento()));
        await EnviarAsync(
            anonimo,
            token,
            [new { id = convite.Convidados[0].Id, resposta = "Confirmado", restricao = Restricao(["SemGluten"], TextoOutra) }, new { id = convite.Convidados[1].Id, resposta = "Confirmado" }]);
        await ObterRelatorioAsync(autenticado, evento.Id);

        Assert.Contains(provedor.Mensagens, mensagem => mensagem.Contains("Relatório de restrições alimentares consultado", StringComparison.Ordinal));
        Assert.DoesNotContain(provedor.Mensagens, mensagem => mensagem.Contains("porco", StringComparison.OrdinalIgnoreCase)
            || mensagem.Contains("rodas", StringComparison.OrdinalIgnoreCase)
            || mensagem.Contains("SemGluten", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("")]
    [InlineData("curta")]
    [InlineData("YWJjZA==")]
    public void SemChaveDedicadaValida_AplicacaoNaoDeveIniciar(string chave)
    {
        using var fabrica = new FabricaApi(
            FabricaApi.StringConexaoInalcancavel,
            configuracoesAdicionais: new Dictionary<string, string?> { ["DadosSensiveis:ChaveCifragem"] = chave });

        var excecao = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());

        Assert.Contains("DadosSensiveis__ChaveCifragem", excecao.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void RetencaoInvalida_AplicacaoNaoDeveIniciar()
    {
        using var fabrica = new FabricaApi(
            FabricaApi.StringConexaoInalcancavel,
            configuracoesAdicionais: new Dictionary<string, string?> { ["RetencaoDadosSensiveis:DiasAposEvento"] = "0" });

        var excecao = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());

        Assert.Contains("RetencaoDadosSensiveis__DiasAposEvento", excecao.ToString(), StringComparison.Ordinal);
    }

    private sealed class CalendarioFixo : ICalendarioLocal
    {
        private readonly DateOnly _hoje;

        public CalendarioFixo(DateOnly hoje)
        {
            _hoje = hoje;
        }

        public DateOnly Hoje()
        {
            return _hoje;
        }

        public DateTime Agora()
        {
            return _hoje.ToDateTime(new TimeOnly(12, 0));
        }
    }

    private sealed class RegistroLogsIntegracao<T> : ILogger<T>
    {
        public List<string> Mensagens { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Mensagens.Add(formatter(state, exception));
        }
    }

    private sealed class ProvedorLogsMemoria : ILoggerProvider
    {
        private readonly ConcurrentQueue<string> _mensagens = new();

        public IReadOnlyList<string> Mensagens => [.. _mensagens];

        public ILogger CreateLogger(string categoryName)
        {
            return new Registrador(_mensagens);
        }

        public void Dispose()
        {
        }

        private sealed class Registrador : ILogger
        {
            private readonly ConcurrentQueue<string> _mensagens;

            public Registrador(ConcurrentQueue<string> mensagens)
            {
                _mensagens = mensagens;
            }

            public IDisposable? BeginScope<TState>(TState state)
                where TState : notnull
            {
                return null;
            }

            public bool IsEnabled(LogLevel logLevel)
            {
                return true;
            }

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                _mensagens.Enqueue($"{formatter(state, exception)} {exception}");
            }
        }
    }
}
