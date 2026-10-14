using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.CronogramaPublico;
using Casamento.Dominio.Cronogramas;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Infraestrutura;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoCasal = Casamento.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteCasamentos = Casamento.Testes.Integracao.Casamentos.ClienteCasamentos;
using ClienteConvites = Casamento.Testes.Integracao.Convidados.ClienteConvites;

namespace Casamento.Testes.Integracao.Cronogramas;

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

    private static string RotaLinks(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/cronograma/links";
    }

    private static string RotaLink(Guid casamentoId, Guid linkId)
    {
        return $"{RotaLinks(casamentoId)}/{linkId}";
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

    private static async Task<LinkCronogramaDto> GerarAsync(HttpClient cliente, Guid casamentoId, object corpo)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaLinks(casamentoId), corpo);
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

    private async Task<HttpClient> CriarClienteCasalAsync(Guid casamentoId)
    {
        var email = ClienteAcessoCasal.EmailCasalUnico();
        await ClienteAcessoCasal.ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamentoId, email);
        var aceite = await ClienteAcessoCasal.AceitarAsync(ClienteAnonimo, ClienteAcessoCasal.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientes.Add(cliente);
        return cliente;
    }

    private async Task<(Guid CasamentoId, Guid Buffet, Guid Som)> CriarCenarioAsync(OrganizacaoTeste organizacao, object? corpoCasamento = null)
    {
        var casamento = await ClienteCasamentos.CriarAsync(organizacao.Cliente, corpoCasamento);
        var buffet = await ClienteCronograma.CriarVinculoAsync(organizacao.Cliente, casamento.Id, $"Buffet Sabor {Guid.NewGuid():N}", "Contratado");
        var som = await ClienteCronograma.CriarVinculoAsync(organizacao.Cliente, casamento.Id, $"Som Total {Guid.NewGuid():N}");
        await ClienteConvites.CriarAsync(organizacao.Cliente, casamento.Id);

        await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Montagem do buffet", "14:00", 90, local: "Espaço Jardim", responsavel: "Fernanda", fornecedorCasamentoId: buffet,
            instrucoes: "Entrada pela rua lateral.", notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Cerimônia", "16:30", 45, responsavel: "fernanda ", notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Jantar", "19:00", 120, responsavel: "Carlos", fornecedorCasamentoId: buffet, notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Pista", "21:30", 270, responsavel: "FERNANDA", fornecedorCasamentoId: som, notasInternas: NotaInterna));
        await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Ensaio", "19:00", 60, dia: "Vespera", responsavel: "Celebrante", notasInternas: NotaInterna));

        return (casamento.Id, buffet, som);
    }

    [Fact]
    public async Task Gerar_DeveSerIdempotenteEArmazenarSoHashECopiaCifrada()
    {
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);

        var primeiro = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });
        var segundo = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });

        Assert.True(FormatoTokenCronograma.Valido(primeiro.Token));
        Assert.Equal(primeiro.Token, segundo.Token);
        await using var contexto = CriarContextoSemOrganizacao();
        var acesso = await contexto.AcessosCronograma.SingleAsync(registro => registro.CasamentoId == casamentoId);
        Assert.Equal(64, acesso.TokenHash.Length);
        Assert.NotEqual(primeiro.Token, acesso.TokenHash);
        Assert.DoesNotContain(primeiro.Token!, acesso.TokenCifrado, StringComparison.Ordinal);
        Assert.Equal(OrganizacaoA.OrganizacaoId, acesso.OrganizacaoId);
        Assert.Equal(TipoAcessoCronograma.Geral, acesso.Tipo);
    }

    [Fact]
    public async Task ConsultaPublica_LinkGeral_DeveTrazerTodosOsItensSemDadosProibidos()
    {
        var (casamentoId, buffet, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });

        var resposta = await ConsultarAsync(ClienteAnonimo, link.Token!);
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal("no-referrer", resposta.Headers.GetValues("Referrer-Policy").Single());
        foreach (var proibido in new[]
        {
            NotaInterna, "R$", "4.000", "3000", "98765", "11987654321", "Flores brancas", "Família Souza", "Carla",
            "exemplo.com", "Marta", "Música da cerimônia", "notasInternas", "telefone", "email", "valor", "observ", "conflito",
            casamentoId.ToString(), buffet.ToString(), OrganizacaoA.OrganizacaoId.ToString(), OrganizacaoA.UsuarioId.ToString(),
        })
        {
            Assert.DoesNotContain(proibido, corpo, StringComparison.OrdinalIgnoreCase);
        }

        var dto = JsonSerializer.Deserialize<CronogramaPublicoDto>(corpo, OpcoesJson)!;
        Assert.Equal("Geral", dto.Filtro.Tipo);
        Assert.Null(dto.Filtro.Rotulo);
        Assert.Equal("Ana Beatriz", dto.Casamento.NomePrimeiraPessoa);
        Assert.Equal("16:30", dto.Casamento.HorarioCerimonia);
        Assert.Equal("Capela São José", dto.Casamento.LocalCerimonia);
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
        var (casamentoId, buffet, som) = await CriarCenarioAsync(OrganizacaoA);
        var (outroCasamento, _, _) = await CriarCenarioAsync(OrganizacaoB);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Fornecedor", fornecedorCasamentoId = buffet });

        var resposta = await ClienteAnonimo.PostAsJsonAsync(RotaConsulta, new
        {
            token = link.Token,
            tipo = "Geral",
            fornecedorCasamentoId = som,
            casamentoId = outroCasamento,
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
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Responsavel", responsavel = "  FERNANDA" });

        var dto = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!);

        Assert.Equal(["Montagem do buffet", "Cerimônia", "Pista"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal("Fernanda", dto.Filtro.Rotulo);
    }

    [Fact]
    public async Task ComBearerDeOutraOrganizacao_ConsultaContinuaRestritaAoCasamentoDoLink()
    {
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        await CriarCenarioAsync(OrganizacaoB);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });

        var dto = await ConsultarComSucessoAsync(OrganizacaoB.Cliente, link.Token!);

        Assert.Equal(5, dto.Itens.Count);
        Assert.Equal("Ana Beatriz", dto.Casamento.NomePrimeiraPessoa);
    }

    [Fact]
    public async Task RegenerarERevogar_TokenAntigoDeveRetornarMesmo404DeInexistenteEMalformado()
    {
        var (casamentoId, buffet, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Fornecedor", fornecedorCasamentoId = buffet });

        var regeneracao = await OrganizacaoA.Cliente.PostAsync($"{RotaLink(casamentoId, link.Id)}/regenerar", null);
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

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaLink(casamentoId, link.Id))).StatusCode);
        Assert.Equal(inexistente, SemTraceId(await CorpoNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, novo.Token!))));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(RotaLink(casamentoId, link.Id)));
    }

    [Fact]
    public async Task AlteracaoNoCronograma_DeveAparecerAoConsultarDeNovo()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Jantar", "19:00"));
        var link = await GerarAsync(OrganizacaoA.Cliente, casamento.Id, new { tipo = "Geral" });

        var antes = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!);
        var atualizacao = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteCronograma.Rota(casamento.Id, item.Id), ClienteCronograma.Corpo("Jantar", "19:30"));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Bolo", "22:00"));
        var depois = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!);

        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);
        Assert.Equal("19:00", Assert.Single(antes.Itens).Inicio);
        Assert.Equal(["19:30", "22:00"], depois.Itens.Select(registro => registro.Inicio));
    }

    [Fact]
    public async Task Expiracao_DeveValerAteSeteDiasDepoisDoCasamento()
    {
        var hoje = ClienteCasamentos.HojeEmSaoPaulo();
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(data: hoje.AddDays(-7).ToString("yyyy-MM-dd")));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamento.Id, new { tipo = "Geral" });

        Assert.Single((await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!)).Itens);

        var mudanca = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{ClienteCasamentos.Rota}/{casamento.Id}",
            ClienteCasamentos.CorpoValido(data: hoje.AddDays(-8).ToString("yyyy-MM-dd")));
        Assert.Equal(HttpStatusCode.OK, mudanca.StatusCode);

        await AssertNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!));
        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<LinksCronogramaDto>(RotaLinks(casamento.Id)))!;
        Assert.True(lista.Expirado);
        Assert.Equal(hoje.AddDays(-1), lista.ValidoAte);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(casamento.Id), new { tipo = "Geral" })).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsync($"{RotaLink(casamento.Id, link.Id)}/regenerar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaLink(casamento.Id, link.Id))).StatusCode);
    }

    [Fact]
    public async Task CasamentoArquivado_DeveDesligarOLinkERestaurarReligar()
    {
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });

        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamentoId}/arquivar", null);

        await AssertNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!));
        Assert.True((await OrganizacaoA.Cliente.GetFromJsonAsync<LinksCronogramaDto>(RotaLinks(casamentoId)))!.Arquivado);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsync($"{RotaLink(casamentoId, link.Id)}/regenerar", null)).StatusCode);

        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamentoId}/restaurar", null);

        Assert.Equal(5, (await ConsultarComSucessoAsync(ClienteAnonimo, link.Token!)).Itens.Count);
    }

    [Fact]
    public async Task Listar_DeveTrazerDestinosComContagemTelefoneEToken()
    {
        var (casamentoId, buffet, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Fornecedor", fornecedorCasamentoId = buffet });

        var resposta = await OrganizacaoA.Cliente.GetAsync(RotaLinks(casamentoId));
        var lista = (await resposta.Content.ReadFromJsonAsync<LinksCronogramaDto>())!;

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal(new DateOnly(2027, 5, 22), lista.ValidoAte);
        Assert.Equal("Geral", lista.Destinos[0].Tipo);
        Assert.Equal(5, lista.Destinos[0].QuantidadeItens);
        var destinoBuffet = lista.Destinos.Single(destino => destino.FornecedorCasamentoId == buffet);
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
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var (_, vinculoDeOutroCasamento, _) = await CriarCenarioAsync(OrganizacaoA);
        var (_, vinculoDeOutraOrganizacao, _) = await CriarCenarioAsync(OrganizacaoB);

        var outroCasamento = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(casamentoId), new { tipo = "Fornecedor", fornecedorCasamentoId = vinculoDeOutroCasamento });
        var outraOrganizacao = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(casamentoId), new { tipo = "Fornecedor", fornecedorCasamentoId = vinculoDeOutraOrganizacao });
        var semResponsavel = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(casamentoId), new { tipo = "Responsavel", responsavel = "Ninguém" });
        var tipoInvalido = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(casamentoId), new { tipo = "Todos" });
        var semTipo = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaLinks(casamentoId), new { });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, outroCasamento.StatusCode);
        Assert.Equal("fornecedorCasamentoId", await CampoAsync(outroCasamento));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, outraOrganizacao.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, semResponsavel.StatusCode);
        Assert.Equal("responsavel", await CampoAsync(semResponsavel));
        Assert.Equal(HttpStatusCode.BadRequest, tipoInvalido.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, semTipo.StatusCode);
    }

    [Fact]
    public async Task RemoverVinculo_DeveApagarOLinkDoFornecedor()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, casamento.Id, $"Doces {Guid.NewGuid():N}");
        var link = await GerarAsync(OrganizacaoA.Cliente, casamento.Id, new { tipo = "Fornecedor", fornecedorCasamentoId = vinculo });

        var remocao = await OrganizacaoA.Cliente.DeleteAsync($"/api/casamentos/{casamento.Id}/fornecedores/{vinculo}");

        Assert.Equal(HttpStatusCode.NoContent, remocao.StatusCode);
        await AssertNaoEncontradoAsync(await ConsultarAsync(ClienteAnonimo, link.Token!));
        await using var contexto = CriarContextoSemOrganizacao();
        Assert.False(await contexto.AcessosCronograma.AnyAsync(acesso => acesso.Id == link.Id));
    }

    [Fact]
    public async Task Casal_DeveReceber403EmTodasAsRotasDeLinks()
    {
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });
        var casal = await CriarClienteCasalAsync(casamentoId);

        Assert.Equal(HttpStatusCode.Forbidden, (await casal.GetAsync(RotaLinks(casamentoId))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await casal.PostAsJsonAsync(RotaLinks(casamentoId), new { tipo = "Geral" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await casal.PostAsync($"{RotaLink(casamentoId, link.Id)}/regenerar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await casal.DeleteAsync(RotaLink(casamentoId, link.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaLinks(casamentoId))).StatusCode);
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404ENaoAlterarOLink()
    {
        var (casamentoId, _, _) = await CriarCenarioAsync(OrganizacaoA);
        var link = await GerarAsync(OrganizacaoA.Cliente, casamentoId, new { tipo = "Geral" });
        var (casamentoDeB, _, _) = await CriarCenarioAsync(OrganizacaoB);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaLinks(casamentoId)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaLinks(casamentoId), new { tipo = "Geral" }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync($"{RotaLink(casamentoId, link.Id)}/regenerar", null));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaLink(casamentoId, link.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaLink(casamentoDeB, link.Id)));

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
