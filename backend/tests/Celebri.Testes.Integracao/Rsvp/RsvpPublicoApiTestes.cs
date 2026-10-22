using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Rsvp;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Rsvp;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Rsvp.ClienteRsvp;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;

namespace Celebri.Testes.Integracao.Rsvp;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class RsvpPublicoApiTestes : IsolamentoOrganizacaoTestesBase
{
    private const string TokenInexistente = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde";

    private readonly BancoPostgreSqlFixture _banco;

    public RsvpPublicoApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
        _banco = banco;
    }

    private async Task<(EventoDto Evento, ConviteDto Convite, string Token)> CriarConviteComLinkAsync(
        OrganizacaoTeste organizacao,
        int limiteAcompanhantes = 1,
        object? corpoEvento = null)
    {
        var evento = await ClienteEventos.CriarAsync(organizacao.Cliente, corpoEvento);
        var convite = await ClienteConvites.CriarAsync(
            organizacao.Cliente,
            evento.Id,
            ClienteConvites.CorpoValido("Família Souza", "Família da noiva", limiteAcompanhantes));
        var link = await GerarLinkAsync(organizacao.Cliente, evento.Id, convite.Id);
        return (evento, convite, link.Token);
    }

    private static IEnumerable<(Guid Id, string Resposta)> Todos(ConviteDto convite, string resposta)
    {
        return convite.Convidados.Select(pessoa => (pessoa.Id, resposta));
    }

    private static async Task<(int Status, string? Titulo, string? Detalhe)> LerProblemaAsync(HttpResponseMessage resposta)
    {
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        return (
            (int)resposta.StatusCode,
            json.RootElement.GetProperty("title").GetString(),
            json.RootElement.TryGetProperty("detail", out var detalhe) ? detalhe.GetString() : null);
    }

    [Fact]
    public async Task GerarLink_DeveSerIdempotenteEArmazenarSoHashECopiaCifrada()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var novamente = await GerarLinkAsync(OrganizacaoA.Cliente, evento.Id, convite.Id);
        var consultado = await OrganizacaoA.Cliente.GetFromJsonAsync<LinkRsvpDto>(RotaLink(evento.Id, convite.Id));

        Assert.True(FormatoTokenRsvp.Valido(token));
        Assert.Equal(token, novamente.Token);
        Assert.Equal(token, consultado!.Token);

        await using var contexto = CriarContextoSemOrganizacao();
        var acesso = await contexto.AcessosRsvp.SingleAsync(registro => registro.ConviteId == convite.Id);
        Assert.Equal(64, acesso.TokenHash.Length);
        Assert.NotEqual(token, acesso.TokenHash);
        Assert.DoesNotContain(token, acesso.TokenCifrado, StringComparison.Ordinal);
        Assert.Equal(OrganizacaoA.OrganizacaoId, acesso.OrganizacaoId);
        Assert.Equal(evento.Id, acesso.EventoId);
    }

    [Fact]
    public async Task Consulta_Anonima_DeveExporSoDadosDoConviteEMarcarVisualizado()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var resposta = await ConsultarAsync(ClienteAnonimo, token);
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal("no-referrer", resposta.Headers.GetValues("Referrer-Policy").Single());
        Assert.DoesNotContain("98765", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain("exemplo.com", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Família da noiva", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain("Flores brancas", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain(evento.Id.ToString(), corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(convite.Id.ToString(), corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(OrganizacaoA.OrganizacaoId.ToString(), corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("telefone", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("email", corpo, StringComparison.OrdinalIgnoreCase);

        var dto = JsonSerializer.Deserialize<RsvpPublicoDto>(corpo, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal("Família Souza", dto.NomeConvite);
        Assert.Equal("Ana Beatriz", dto.Evento.NomePrimeiraPessoa);
        Assert.Equal("16:30", dto.Evento.Horario);
        Assert.Equal(new DateOnly(2027, 5, 5), dto.DataLimiteResposta);
        Assert.True(dto.PodeResponder);
        Assert.Equal(convite.Convidados.Select(pessoa => pessoa.Id).Order(), dto.Pessoas.Select(pessoa => pessoa.Id).Order());

        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.Equal("Visualizado", Assert.Single(lista.Convites).StatusEnvio);
    }

    [Fact]
    public async Task Responder_FluxoCompleto_DeveGravarRespostasEAcompanhanteNaListaDaCerimonialista()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var resposta = await ResponderAsync(ClienteAnonimo, token, Todos(convite, "Confirmado"), Acompanhante("Pedro Lima"));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var dto = (await resposta.Content.ReadFromJsonAsync<RsvpPublicoDto>())!;
        Assert.All(dto.Pessoas, pessoa => Assert.Equal("Confirmado", pessoa.Resposta));
        Assert.Equal("Pedro Lima", Assert.Single(dto.Acompanhantes).Nome);
        Assert.NotNull(dto.RespondidoEm);

        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        var atualizado = Assert.Single(lista.Convites);
        Assert.Equal("Visualizado", atualizado.StatusEnvio);
        Assert.NotNull(atualizado.RespondidoEm);
        Assert.True(atualizado.Convidados.Single(pessoa => pessoa.Nome == "Pedro Lima").Acompanhante);
        Assert.Equal(3, lista.Totais.Confirmados.Total);
        Assert.Equal(0, lista.Totais.AcompanhantesPermitidos);

        var alteracao = await ResponderAsync(
            ClienteAnonimo,
            token,
            Todos(convite, "Recusado"));
        Assert.Equal(HttpStatusCode.OK, alteracao.StatusCode);
        var semAcompanhante = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.DoesNotContain(semAcompanhante.Convites[0].Convidados, pessoa => pessoa.Acompanhante);
        Assert.All(semAcompanhante.Convites[0].Convidados, pessoa => Assert.Equal("Recusado", pessoa.Resposta));
    }

    [Fact]
    public async Task Idor_TokenDeAComPessoaDeOutroConviteDaMesmaOrganizacao_DeveRejeitarSemAlterarNada()
    {
        var (evento, conviteA, tokenA) = await CriarConviteComLinkAsync(OrganizacaoA);
        var conviteB = await ClienteConvites.CriarAsync(
            OrganizacaoA.Cliente,
            evento.Id,
            ClienteConvites.CorpoValido("Família Lima", null, 0, ClienteConvites.Pessoa("Marcos Lima")));

        var pessoas = new List<(Guid, string)> { (conviteA.Convidados[0].Id, "Confirmado"), (conviteB.Convidados[0].Id, "Recusado") };
        var resposta = await ResponderAsync(ClienteAnonimo, tokenA, pessoas);
        var consulta = await ConsultarAsync(ClienteAnonimo, tokenA);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.DoesNotContain("Marcos", await consulta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.All(lista.Convites.SelectMany(convite => convite.Convidados), pessoa => Assert.Equal("Pendente", pessoa.Resposta));
    }

    [Fact]
    public async Task Idor_TokenDeAComPessoaDeOutraOrganizacao_DeveRejeitarENaoAlterarB()
    {
        var (_, conviteA, tokenA) = await CriarConviteComLinkAsync(OrganizacaoA);
        var (eventoB, conviteB, _) = await CriarConviteComLinkAsync(OrganizacaoB);

        var pessoas = conviteB.Convidados.Select(pessoa => (pessoa.Id, "Recusado")).Concat(Todos(conviteA, "Confirmado"));
        var resposta = await ResponderAsync(ClienteAnonimo, tokenA, pessoas);
        var acompanhanteSequestrado = await ResponderAsync(
            ClienteAnonimo,
            tokenA,
            Todos(conviteA, "Confirmado"),
            Acompanhante("Sequestro", id: conviteB.Convidados[0].Id));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, acompanhanteSequestrado.StatusCode);
        var listaB = await ClienteConvites.ListarAsync(OrganizacaoB.Cliente, eventoB.Id);
        Assert.All(listaB.Convites[0].Convidados, pessoa => Assert.Equal("Pendente", pessoa.Resposta));
        Assert.DoesNotContain(listaB.Convites[0].Convidados, pessoa => pessoa.Nome == "Sequestro");
    }

    [Fact]
    public async Task Consulta_ComUsuarioDeOutraOrganizacaoLogado_DeveFicarRestritaAoConviteDoToken()
    {
        var (_, conviteA, tokenA) = await CriarConviteComLinkAsync(OrganizacaoA);
        await CriarConviteComLinkAsync(OrganizacaoB);

        var dto = await ConsultarComSucessoAsync(OrganizacaoB.Cliente, tokenA);

        Assert.Equal(conviteA.Convidados.Select(pessoa => pessoa.Id).Order(), dto.Pessoas.Select(pessoa => pessoa.Id).Order());
    }

    [Fact]
    public async Task TokenMalformadoInexistenteOuRevogado_DevemTerRespostaUniforme()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var revogacao = await OrganizacaoA.Cliente.DeleteAsync(RotaLink(evento.Id, convite.Id));
        Assert.Equal(HttpStatusCode.NoContent, revogacao.StatusCode);

        var malformado = await LerProblemaAsync(await ConsultarAsync(ClienteAnonimo, "abc' OR 1=1 --"));
        var inexistente = await LerProblemaAsync(await ConsultarAsync(ClienteAnonimo, TokenInexistente));
        var revogado = await LerProblemaAsync(await ConsultarAsync(ClienteAnonimo, token));
        var respostaRevogado = await LerProblemaAsync(await ResponderAsync(ClienteAnonimo, token, Todos(convite, "Confirmado")));

        Assert.Equal(404, revogado.Status);
        Assert.Equal(MensagensRsvp.LinkInvalido, revogado.Detalhe);
        Assert.Equal(revogado, malformado);
        Assert.Equal(revogado, inexistente);
        Assert.Equal(revogado, respostaRevogado);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoA.Cliente.GetAsync(RotaLink(evento.Id, convite.Id))).StatusCode);
    }

    [Fact]
    public async Task Regenerar_DeveInvalidarLinkAnteriorEPreservarRespostas()
    {
        var (evento, convite, tokenAntigo) = await CriarConviteComLinkAsync(OrganizacaoA);
        Assert.Equal(HttpStatusCode.OK, (await ResponderAsync(ClienteAnonimo, tokenAntigo, Todos(convite, "Confirmado"))).StatusCode);

        var regeneracao = await OrganizacaoA.Cliente.PostAsync($"{RotaLink(evento.Id, convite.Id)}/regenerar", null);
        var novo = (await regeneracao.Content.ReadFromJsonAsync<LinkRsvpDto>())!;

        Assert.Equal(HttpStatusCode.OK, regeneracao.StatusCode);
        Assert.NotEqual(tokenAntigo, novo.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await ConsultarAsync(ClienteAnonimo, tokenAntigo)).StatusCode);
        var dto = await ConsultarComSucessoAsync(ClienteAnonimo, novo.Token);
        Assert.All(dto.Pessoas, pessoa => Assert.Equal("Confirmado", pessoa.Resposta));
    }

    [Fact]
    public async Task PrazoEncerrado_DeveMostrarLeituraERecusarResposta()
    {
        var hoje = ClienteEventos.HojeEmSaoPaulo();
        var corpo = new
        {
            tipo = "Casamento",
            nomePrimeiraPessoa = "Ana Beatriz",
            nomeSegundaPessoa = "Bruno",
            data = hoje.AddDays(30).ToString("yyyy-MM-dd"),
            dataLimiteRsvp = hoje.AddDays(-1).ToString("yyyy-MM-dd"),
        };
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA, corpoEvento: corpo);

        var dto = await ConsultarComSucessoAsync(ClienteAnonimo, token);
        var resposta = await ResponderAsync(ClienteAnonimo, token, Todos(convite, "Confirmado"));

        Assert.False(dto.PodeResponder);
        Assert.Equal(hoje.AddDays(-1), dto.DataLimiteResposta);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensRsvp.PrazoEncerrado, (await LerProblemaAsync(resposta)).Detalhe);
    }

    [Fact]
    public async Task EventoComDataLimitePosteriorAoEvento_DeveRetornar400()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteEventos.Rota, new
        {
            tipo = "Casamento",
            nomePrimeiraPessoa = "Ana",
            nomeSegundaPessoa = "Bruno",
            data = "2027-05-15",
            dataLimiteRsvp = "2027-05-16",
        });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Responder_AcimaDoLimiteDeAcompanhantes_DeveRetornar422SemGravar()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA, limiteAcompanhantes: 1);

        var resposta = await ResponderAsync(ClienteAnonimo, token, Todos(convite, "Confirmado"), Acompanhante("Pedro"), Acompanhante("Nina"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensConvidados.LimiteAcompanhantesExcedido, (await LerProblemaAsync(resposta)).Detalhe);
        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.Equal(2, lista.Convites[0].Convidados.Count);
    }

    [Fact]
    public async Task Responder_CorpoInvalido_DeveRetornar400()
    {
        var (_, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var semPessoas = await ClienteAnonimo.PutAsJsonAsync(RotaResposta, new { token });
        var respostaDesconhecida = await ResponderAsync(ClienteAnonimo, token, Todos(convite, "Talvez"));

        Assert.Equal(HttpStatusCode.BadRequest, semPessoas.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, respostaDesconhecida.StatusCode);
    }

    [Fact]
    public async Task MarcarEnviado_DeveAvancarSemRegredirDepoisDeVisualizado()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        var enviado = await OrganizacaoA.Cliente.PostAsync(RotaEnvio(evento.Id, convite.Id), null);
        Assert.Equal("Enviado", (await enviado.Content.ReadFromJsonAsync<ConviteDto>())!.StatusEnvio);

        await ConsultarComSucessoAsync(ClienteAnonimo, token);
        var novamente = await OrganizacaoA.Cliente.PostAsync(RotaEnvio(evento.Id, convite.Id), null);

        Assert.Equal("Visualizado", (await novamente.Content.ReadFromJsonAsync<ConviteDto>())!.StatusEnvio);
    }

    [Fact]
    public async Task EndpointsDeLink_DeOutraOrganizacaoOuAnonimo_DevemSerNegados()
    {
        var (evento, convite, _) = await CriarConviteComLinkAsync(OrganizacaoA);
        var rota = RotaLink(evento.Id, convite.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(rota));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(rota, null));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync($"{rota}/regenerar", null));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(rota));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(RotaEnvio(evento.Id, convite.Id), null));
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(rota)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsync(rota, null)).StatusCode);

        var linkA = await OrganizacaoA.Cliente.GetFromJsonAsync<LinkRsvpDto>(rota);
        Assert.NotNull(linkA);
    }

    [Fact]
    public async Task EventoArquivado_DeveBloquearGeracaoMasPermitirConsultarLink()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        var arquivamento = await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{evento.Id}/arquivar", null);
        Assert.True(arquivamento.IsSuccessStatusCode);

        var regenerar = await OrganizacaoA.Cliente.PostAsync($"{RotaLink(evento.Id, convite.Id)}/regenerar", null);
        var consultar = await OrganizacaoA.Cliente.GetFromJsonAsync<LinkRsvpDto>(RotaLink(evento.Id, convite.Id));
        var publico = await ConsultarComSucessoAsync(ClienteAnonimo, token);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, regenerar.StatusCode);
        Assert.Equal(token, consultar!.Token);
        Assert.False(publico.PodeResponder);
    }

    [Fact]
    public async Task ExcluirConvite_DeveApagarOAcessoEmCascata()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(ClienteConvites.Rota(evento.Id, convite.Id))).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await ConsultarAsync(ClienteAnonimo, token)).StatusCode);
        await using var contexto = CriarContextoSemOrganizacao();
        Assert.False(await contexto.AcessosRsvp.AnyAsync(acesso => acesso.ConviteId == convite.Id));
    }

    [Fact]
    public async Task EndpointPublico_AcimaDoLimitePorIp_DeveRetornar429()
    {
        await using var fabrica = new FabricaApiAutenticacao(
            _banco.CriarStringConexaoBancoNovo(),
            new Dictionary<string, string?> { ["LimitesRequisicao:rsvp:Limite"] = "2" });
        using var cliente = fabrica.CriarClienteHttps();

        await ConsultarAsync(cliente, TokenInexistente);
        await ConsultarAsync(cliente, TokenInexistente);
        var bloqueada = await ConsultarAsync(cliente, TokenInexistente);
        var respostaBloqueada = await cliente.PutAsJsonAsync(RotaResposta, new { token = TokenInexistente, pessoas = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.TooManyRequests, bloqueada.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, respostaBloqueada.StatusCode);
        Assert.True(bloqueada.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task Concorrencia_DuasRespostasSimultaneas_NaoDevemDuplicarAcompanhantes()
    {
        var (evento, convite, token) = await CriarConviteComLinkAsync(OrganizacaoA, limiteAcompanhantes: 1);

        using var cliente1 = Fabrica.CriarClienteHttps();
        using var cliente2 = Fabrica.CriarClienteHttps();
        var respostas = await Task.WhenAll(
            ResponderAsync(cliente1, token, Todos(convite, "Confirmado"), Acompanhante("Pedro")),
            ResponderAsync(cliente2, token, Todos(convite, "Confirmado"), Acompanhante("Pedro")));

        Assert.All(respostas, resposta => Assert.Contains(resposta.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(lista.Convites[0].Convidados.Count(pessoa => pessoa.Acompanhante) <= 1);
    }

    [Fact]
    public async Task ComBearerInvalido_EndpointPublicoContinuaAnonimo()
    {
        var (_, _, token) = await CriarConviteComLinkAsync(OrganizacaoA);
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, RotaConsulta)
        {
            Content = JsonContent.Create(new { token }),
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "token-invalido");

        var resposta = await ClienteAnonimo.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }
}
