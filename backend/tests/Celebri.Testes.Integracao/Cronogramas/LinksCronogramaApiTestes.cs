using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.CronogramaPublico;
using Celebri.Dominio.Cronogramas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class LinksCronogramaApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private const string RotaConsulta = "/api/cronograma-publico/consulta";
    private const string TokenInexistente = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde";
    private const string NotaInterna = "Pagar saldo de R$ 4.000 em espécie";

    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    private readonly BancoPostgreSqlFixture _banco;
    private readonly List<HttpClient> _clientes = [];

    public LinksCronogramaApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
        _banco = banco;
    }

    public void Dispose()
    {
        foreach (var cliente in _clientes)
        {
            cliente.Dispose();
        }
    }

    private static string RotaLinks(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/cronograma/links";
    }

    private static string RotaLink(Guid eventoId, Guid linkId)
    {
        return $"{RotaLinks(eventoId)}/{linkId}";
    }

    private static Task<HttpResponseMessage> ConsultarAsync(HttpClient cliente, string token)
    {
        return cliente.PostAsJsonAsync(RotaConsulta, new { token });
    }

    private static async Task<CronogramaPublicoDto> ConsultarComSucessoAsync(HttpClient cliente, string token)
    {
        var resposta = await ConsultarAsync(cliente, token);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<CronogramaPublicoDto>(OpcoesJson))!;
    }

    private static async Task<LinkCronogramaDto> GerarAsync(HttpClient cliente, Guid eventoId, object corpo)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaLinks(eventoId), corpo);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<LinkCronogramaDto>())!;
    }

    private static async Task<string> CorpoNaoEncontradoAsync(HttpResponseMessage resposta)
    {
        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        return await resposta.Content.ReadAsStringAsync();
    }

    private static string SemTraceId(string corpo)
    {
        using var json = JsonDocument.Parse(corpo);
        return $"{json.RootElement.GetProperty("title").GetString()}|{json.RootElement.GetProperty("detail").GetString()}|{json.RootElement.GetProperty("status").GetInt32()}";
    }

    private static async Task<string?> CampoAsync(HttpResponseMessage resposta)
    {
        var problema = (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;
        return problema.Extensions.TryGetValue("campo", out var campo) ? campo?.ToString() : null;
    }

    private async Task<HttpClient> CriarClienteAnfitriaoAsync(Guid eventoId)
    {
        var email = ClienteAcessoAnfitriao.EmailAnfitriaoUnico();
        await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, eventoId, email);
        var aceite = await ClienteAcessoAnfitriao.AceitarAsync(ClienteAnonimo, ClienteAcessoAnfitriao.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientes.Add(cliente);
        return cliente;
    }

    private async Task<(Guid EventoId, Guid Buffet, Guid Som)> CriarCenarioAsync(OrganizacaoTeste organizacao, object? corpoEvento = null)
    {
        var evento = await ClienteEventos.CriarAsync(organizacao.Cliente, corpoEvento);
        var buffet = await ClienteCronograma.CriarVinculoAsync(organizacao.Cliente, evento.Id, $"Buffet Sabor {Guid.NewGuid():N}", "Contratado");
        var som = await ClienteCronograma.CriarVinculoAsync(organizacao.Cliente, evento.Id, $"Som Total {Guid.NewGuid():N}");
        await ClienteConvites.CriarAsync(organizacao.Cliente, evento.Id);

        await ClienteCronograma.CriarAsync(organizacao.Cliente, evento.Id, ClienteCronograma.Corpo(
            "Montagem do buffet", "14:00", 90, local: "Espaço Jardim", responsavel: "Fernanda", fornecedorEventoId: buffet,
            instrucoes: "Entrada pela rua lateral.", notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, evento.Id, ClienteCronograma.Corpo(
            "Cerimônia", "16:30", 45, responsavel: "fernanda ", notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, evento.Id, ClienteCronograma.Corpo(
            "Jantar", "19:00", 120, responsavel: "Carlos", fornecedorEventoId: buffet, notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, evento.Id, ClienteCronograma.Corpo(
            "Pista", "21:30", 270, responsavel: "FERNANDA", fornecedorEventoId: som, notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, evento.Id, ClienteCronograma.Corpo(
            "Ensaio", "19:00", 60, dia: "Vespera", responsavel: "Celebrante", notasInternas: NotaInterna));

        return (evento.Id, buffet, som);
    }

    [Fact]
    public async Task Gerar_DeveSerIdempotenteEArmazenarSoHashECopiaCifrada()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);

        var primeiro = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });
        var segundo = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });

        Assert.True(FormatoTokenCronograma.Valido(primeiro.Token));
        Assert.Equal(primeiro.Token, segundo.Token);
        await using var contexto = CriarContextoSemOrganizacao();
        var acesso = await contexto.AcessosCronograma.SingleAsync(registro => registro.EventoId == eventoId);
        Assert.Equal(64, acesso.TokenHash.Length);
        Assert.NotEqual(primeiro.Token, acesso.TokenHash);
        Assert.DoesNotContain(primeiro.Token!, acesso.TokenCifrado, StringComparison.Ordinal);
        Assert.Equal(OrganizacaoA.OrganizacaoId, acesso.OrganizacaoId);
        Assert.Equal(TipoAcessoCronograma.Geral, acesso.Tipo);
    }

    [Fact]
    public async Task ConsultaPublica_LinkGeral_DeveTrazerTodosOsItensSemDadosProibidos()
    {
        var (eventoId, buffet, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });

        var resposta = await ConsultarAsync(ClienteAnonimo, link.Token!);
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal("no-referrer", resposta.Headers.GetValues("Referrer-Policy").Single());
        foreach (var proibido in new[]
        {
            NotaInterna, "R$", "4.000", "3000", "98765", "11987654321", "Flores brancas", "Família Souza", "Carla",
            "exemplo.com", "Marta", "Música da cerimônia", "notasInternas", "telefone", "email", "valor", "observ", "conflito",
            eventoId.ToString(), buffet.ToString(), OrganizacaoA.OrganizacaoId.ToString(), OrganizacaoA.UsuarioId.ToString(),
        })
        {
            Assert.DoesNotContain(proibido, corpo, StringComparison.OrdinalIgnoreCase);
        }

        var dto = JsonSerializer.Deserialize<CronogramaPublicoDto>(corpo, OpcoesJson)!;
        Assert.Equal("Geral", dto.Filtro.Tipo);
        Assert.Null(dto.Filtro.Rotulo);
        Assert.Equal("Ana Beatriz", dto.Evento.NomePrimeiraPessoa);
        Assert.Equal("16:30", dto.Evento.HorarioCerimonia);
        Assert.Equal("Capela São José", dto.Evento.LocalCerimonia);
        Assert.Equal(new DateOnly(2027, 5, 22), dto.ValidoAte);
        Assert.Equal(["Ensaio", "Montagem do buffet", "Cerimônia", "Jantar", "Pista"], dto.Itens.Select(item => item.Atividade));
        var montagem = dto.Itens[1];
        Assert.Equal("Entrada pela rua lateral.", montagem.Instrucoes);
        Assert.Equal("15:30", montagem.Termino);
        Assert.StartsWith("Buffet Sabor", montagem.Fornecedor!.NomeEmpresa, StringComparison.Ordinal);
        Assert.Equal("Musica", montagem.Fornecedor.Categoria);
        Assert.True(dto.Itens[4].TerminaEmOutroDia);
        Assert.Equal(new DateOnly(2027, 5, 14), dto.Itens[0].Data);
    }

    [Fact]
    public async Task LinkDeFornecedor_DeveTrazerSoItensDoVinculoMesmoComCorpoManipulado()
    {
        var (eventoId, buffet, som) = await CriarCenarioAsync(OrganizacaoA);
        var (outroEvento, _, _) = await CriarCenarioAsync(OrganizacaoB);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Fornecedor", fornecedorEventoId = buffet });

        var resposta = await ClienteAnonimo.PostAsJsonAsync(RotaConsulta, new
        {
            token = link.Token,
            tipo = "Geral",
            fornecedorEventoId = som,
            eventoId = outroEvento,
            organizacaoId = OrganizacaoB.OrganizacaoId,
        });
        var dto = (await resposta.Content.ReadFromJsonAsync<CronogramaPublicoDto>(OpcoesJson))!;

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Equal(["Montagem do buffet", "Jantar"], dto.Itens.Select(item => item.Atividade));
        Assert.All(dto.Itens, item => Assert.StartsWith("Buffet Sabor", item.Fornecedor!.NomeEmpresa, StringComparison.Ordinal));
        Assert.Equal("Fornecedor", dto.Filtro.Tipo);
        Assert.StartsWith("Buffet Sabor", dto.Filtro.Rotulo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LinkDeResponsavel_DeveUsarChaveNormalizada()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Responsavel", responsavel = "  FERNANDA" });

        var dto = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!);

        Assert.Equal(["Montagem do buffet", "Cerimônia", "Pista"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal("Fernanda", dto.Filtro.Rotulo);
    }

    [Fact]
    public async Task ComBearerDeOutraOrganizacao_ConsultaContinuaRestritaAoEventoDoLink()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        await CriarCenarioAsync(OrganizacaoB);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });

        var dto = await ConsultarComSucessoAsync(OrganizacaoB.Cliente, link.Token!);

        Assert.Equal(5, dto.Itens.Count);
        Assert.Equal("Ana Beatriz", dto.Evento.NomePrimeiraPessoa);
    }

    [Fact]
    public async Task RegenerarERevogar_TokenAntigoDeveRetornarMesmo404DeInexistenteEMalformado()
    {
        var (eventoId, buffet, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Fornecedor", fornecedorEventoId = buffet });

        var regeneracao = await OrganizacaoA.Cliente.PostAsync($"{RotaLink(eventoId, link.Id)}/regenerar", null);
        var novo = (await regeneracao.Content.ReadFromJsonAsync<LinkCronogramaDto>())!;
        var antigo = SemTraceId(await CorpoNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!)));
        var inexistente = SemTraceId(await CorpoNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, TokenInexistente)));
        var malformado = SemTraceId(await CorpoNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, "curto")));

        Assert.Equal(HttpStatusCode.OK, regeneracao.StatusCode);
        Assert.Equal(link.Id, novo.Id);
        Assert.NotEqual(link.Token, novo.Token);
        Assert.Equal(inexistente, antigo);
        Assert.Equal(inexistente, malformado);
        Assert.Equal(2, (await ConsultarComSucessoAsync(ClienteAnonimo, novo.Token!)).Itens.Count);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaLink(eventoId, link.Id))).StatusCode);
        Assert.Equal(inexistente, SemTraceId(await CorpoNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, novo.Token!))));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(RotaLink(eventoId, link.Id)));
    }

    [Fact]
    public async Task AlteracaoNoCronograma_DeveAparecerAoConsultarDeNovo()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Jantar", "19:00"));
        var link = await GerarAsync(OrganizacaoA.Cliente, evento.Id, new { tipo = "Geral" });

        var antes = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!);
        var atualizacao = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteCronograma.Rota(evento.Id, item.Id), ClienteCronograma.Corpo("Jantar", "19:30"));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Bolo", "22:00"));
        var depois = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!);

        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);
        Assert.Equal("19:00", Assert.Single(antes.Itens).Inicio);
        Assert.Equal(["19:30", "22:00"], depois.Itens.Select(registro => registro.Inicio));
    }

    [Fact]
    public async Task Expiracao_DeveValerAteSeteDiasDepoisDoEvento()
    {
        var hoje = ClienteEventos.HojeEmSaoPaulo();
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente, ClienteEventos.CorpoValido(data: hoje.AddDays(-7).ToString("yyyy-MM-dd")));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        var link = await GerarAsync(OrganizacaoA.Cliente, evento.Id, new { tipo = "Geral" });

        Assert.Single((await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!)).Itens);

        var mudanca = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{ClienteEventos.Rota}/{evento.Id}",
            ClienteEventos.CorpoValido(data: hoje.AddDays(-8).ToString("yyyy-MM-dd")));
        Assert.Equal(HttpStatusCode.OK, mudanca.StatusCode);

        await AssertNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!));
        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<LinksCronogramaDto>(RotaLinks(evento.Id)))!;
        Assert.True(lista.Expirado);
        Assert.Equal(hoje.AddDays(-1), lista.ValidoAte);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(evento.Id), new { tipo = "Geral" })).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsync($"{RotaLink(evento.Id, link.Id)}/regenerar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaLink(evento.Id, link.Id))).StatusCode);
    }

    [Fact]
    public async Task EventoArquivado_DeveDesligarOLinkERestaurarReligar()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });

        await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{eventoId}/arquivar", null);

        await AssertNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!));
        Assert.True((await OrganizacaoA.Cliente.GetFromJsonAsync<LinksCronogramaDto>(RotaLinks(eventoId)))!.Arquivado);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsync($"{RotaLink(eventoId, link.Id)}/regenerar", null)).StatusCode);

        await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{eventoId}/restaurar", null);

        Assert.Equal(5, (await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!)).Itens.Count);
    }

    [Fact]
    public async Task Listar_DeveTrazerDestinosComContagemTelefoneEToken()
    {
        var (eventoId, buffet, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Fornecedor", fornecedorEventoId = buffet });

        var resposta = await OrganizacaoA.Cliente.GetAsync(RotaLinks(eventoId));
        var lista = (await resposta.Content.ReadFromJsonAsync<LinksCronogramaDto>())!;

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal(new DateOnly(2027, 5, 22), lista.ValidoAte);
        Assert.Equal("Geral", lista.Destinos[0].Tipo);
        Assert.Equal(5, lista.Destinos[0].QuantidadeItens);
        var destinoBuffet = lista.Destinos.Single(destino => destino.FornecedorEventoId == buffet);
        Assert.Equal(2, destinoBuffet.QuantidadeItens);
        Assert.Equal("11987654321", destinoBuffet.Telefone);
        Assert.Equal(link.Token, destinoBuffet.Link!.Token);
        Assert.Equal(
            ["Carlos", "Celebrante", "Fernanda"],
            lista.Destinos.Where(destino => destino.Tipo == "Responsavel").Select(destino => destino.Rotulo));
        Assert.Equal(3, lista.Destinos.Single(destino => destino.Rotulo == "Fernanda").QuantidadeItens);
    }

    [Fact]
    public async Task Gerar_DestinosInvalidos_DevemRetornar422NoCampoOu400()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var (_, vinculoDeOutroEvento, _) = await CriarCenarioAsync(OrganizacaoA);
        var (_, vinculoDeOutraOrganizacao, _) = await CriarCenarioAsync(OrganizacaoB);

        var outroEvento = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Fornecedor", fornecedorEventoId = vinculoDeOutroEvento });
        var outraOrganizacao = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Fornecedor", fornecedorEventoId = vinculoDeOutraOrganizacao });
        var semResponsavel = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Responsavel", responsavel = "Ninguém" });
        var tipoInvalido = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Todos" });
        var semTipo = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(eventoId), new { });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, outroEvento.StatusCode);
        Assert.Equal("fornecedorEventoId", await CampoAsync(outroEvento));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, outraOrganizacao.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, semResponsavel.StatusCode);
        Assert.Equal("responsavel", await CampoAsync(semResponsavel));
        Assert.Equal(HttpStatusCode.BadRequest, tipoInvalido.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, semTipo.StatusCode);
    }

    [Fact]
    public async Task RemoverVinculo_DeveApagarOLinkDoFornecedor()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, evento.Id, $"Doces {Guid.NewGuid():N}");
        var link = await GerarAsync(OrganizacaoA.Cliente, evento.Id, new { tipo = "Fornecedor", fornecedorEventoId = vinculo });

        var remocao = await OrganizacaoA.Cliente.DeleteAsync($"/api/eventos/{evento.Id}/fornecedores/{vinculo}");

        Assert.Equal(HttpStatusCode.NoContent, remocao.StatusCode);
        await AssertNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!));
        await using var contexto = CriarContextoSemOrganizacao();
        Assert.False(await contexto.AcessosCronograma.AnyAsync(acesso => acesso.Id == link.Id));
    }

    [Fact]
    public async Task Anfitriao_DeveReceber403EmTodasAsRotasDeLinks()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });
        var anfitriao = await CriarClienteAnfitriaoAsync(eventoId);

        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.GetAsync(RotaLinks(eventoId))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Geral" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.PostAsync($"{RotaLink(eventoId, link.Id)}/regenerar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.DeleteAsync(RotaLink(eventoId, link.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaLinks(eventoId))).StatusCode);
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404ENaoAlterarOLink()
    {
        var (eventoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, eventoId, new { tipo = "Geral" });
        var (eventoDeB, _, _) = await CriarCenarioAsync(OrganizacaoB);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaLinks(eventoId)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Geral" }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync($"{RotaLink(eventoId, link.Id)}/regenerar", null));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaLink(eventoId, link.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaLink(eventoDeB, link.Id)));

        Assert.Equal(5, (await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!)).Itens.Count);
    }

    [Fact]
    public async Task EndpointPublico_AcimaDoLimitePorIp_DeveRetornar429()
    {
        await using var fabrica = new FabricaApiAutenticacao(
            _banco.CriarStringConexaoBancoNovo(),
            new Dictionary<string, string?> { ["LimitesRequisicao:cronograma-publico:Limite"] = "2" });
        using var cliente = fabrica.CriarClienteHttps();

        await ConsultarAsync(cliente, TokenInexistente);
        await ConsultarAsync(cliente, TokenInexistente);
        var bloqueada = await ConsultarAsync(cliente, TokenInexistente);

        Assert.Equal(HttpStatusCode.TooManyRequests, bloqueada.StatusCode);
        Assert.True(bloqueada.Headers.Contains("Retry-After"));
    }
}
