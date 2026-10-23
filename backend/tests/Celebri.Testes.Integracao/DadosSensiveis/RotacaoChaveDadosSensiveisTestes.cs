using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Celebri.Api;
using Celebri.Aplicacao.CronogramaPublico;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.DadosSensiveis.Portas;
using Celebri.Aplicacao.Recifragem;
using Celebri.Infraestrutura.Persistencia.Repositorios;
using Celebri.Infraestrutura.Seguranca;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;

namespace Celebri.Testes.Integracao.DadosSensiveis;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class RotacaoChaveDadosSensiveisTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private const string ChaveAntiga = FabricaApi.ChaveDadosSensiveisTeste;
    private const string TextoOutra = "Não come frutos do mar";
    private const string TextoNecessidade = "Mesa perto da rampa de acesso";

    private static readonly string ChaveNova = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    private readonly List<IDisposable> _fabricas = [];
    private readonly List<HttpClient> _clientes = [];

    public RotacaoChaveDadosSensiveisTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientes)
        {
            cliente.Dispose();
        }

        foreach (var fabrica in _fabricas)
        {
            fabrica.Dispose();
        }
    }

    private static string RotaRelatorio(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/restricoes-alimentares";
    }

    private static string RotaRestricao(Guid eventoId, Guid conviteId, Guid convidadoId)
    {
        return $"{ClienteConvites.Rota(eventoId, conviteId)}/convidados/{convidadoId}/restricao-alimentar";
    }

    private static string RotaLinks(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/cronograma/links";
    }

    private static CifradorDadosSensiveis CifradorSo(string chave)
    {
        return new CifradorDadosSensiveis(Options.Create(new OpcoesDadosSensiveis { ChaveCifragem = chave }));
    }

    private static CifradorTokenCronograma CifradorCronogramaSo(string chave)
    {
        return new CifradorTokenCronograma(Options.Create(new OpcoesDadosSensiveis { ChaveCifragem = chave }));
    }

    private WebApplicationFactory<Program> FabricaComChaves(string atual, string? anterior)
    {
        var fabrica = Fabrica.WithWebHostBuilder(construtor =>
        {
            construtor.UseSetting("DadosSensiveis:ChaveCifragem", atual);
            construtor.UseSetting("DadosSensiveis:ChaveCifragemAnterior", anterior ?? string.Empty);
        });
        _fabricas.Add(fabrica);
        return fabrica;
    }

    private HttpClient ClienteDe(WebApplicationFactory<Program> fabrica, OrganizacaoTeste organizacao)
    {
        var cliente = fabrica.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = false,
            AllowAutoRedirect = false,
        });
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", organizacao.TokenAcesso);
        _clientes.Add(cliente);
        return cliente;
    }

    private static async Task<(Guid EventoId, Guid ConviteId, Guid ConvidadoId)> RegistrarRestricaoAsync(HttpClient cliente, string outra = TextoOutra)
    {
        var evento = await ClienteEventos.CriarAsync(cliente, ClienteEventos.CorpoValido(data: "2027-05-15"));
        var convite = await ClienteConvites.CriarAsync(
            cliente,
            evento.Id,
            ClienteConvites.CorpoValido("Família Prado", null, 0, ClienteConvites.Pessoa($"Rita Prado {Guid.NewGuid():N}")));
        var convidado = convite.Convidados[0].Id;

        var resposta = await cliente.PutAsJsonAsync(
            RotaRestricao(evento.Id, convite.Id, convidado),
            new { tipos = new[] { "SemGluten" }, outraRestricao = outra, necessidadeEspecial = TextoNecessidade, consentimentoObtido = true });
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);

        return (evento.Id, convite.Id, convidado);
    }

    private static async Task<string> GerarLinkCronogramaAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaLinks(eventoId), new { tipo = "Geral" });
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<LinkCronogramaDto>(OpcoesJson))!.Token!;
    }

    private static async Task<RelatorioRestricoesAlimentaresDto> ObterRelatorioAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(RotaRelatorio(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<RelatorioRestricoesAlimentaresDto>(OpcoesJson))!;
    }

    private static async Task<string?> ObterTokenLinkGeralAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(RotaLinks(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var links = (await resposta.Content.ReadFromJsonAsync<LinksCronogramaDto>(OpcoesJson))!;
        return links.Destinos.Single(destino => destino.Tipo == "Geral").Link!.Token;
    }

    private async Task<string> CifraDadosSensiveisAsync(OrganizacaoTeste organizacao, Guid convidadoId)
    {
        await using var contexto = CriarContexto(organizacao);
        return (await contexto.DadosSensiveisConvidados.AsNoTracking().SingleAsync(dados => dados.ConvidadoId == convidadoId)).ConteudoCifrado!;
    }

    private async Task<string> CifraLinkAsync(OrganizacaoTeste organizacao, Guid eventoId)
    {
        await using var contexto = CriarContexto(organizacao);
        return (await contexto.AcessosCronograma.AsNoTracking().SingleAsync(acesso => acesso.EventoId == eventoId)).TokenCifrado;
    }

    private static ExecutorRecifragemDadosSensiveis CriarExecutor(WebApplicationFactory<Program> fabrica, ILogger<ExecutorRecifragemDadosSensiveis> logs, int tamanhoLote)
    {
        return new ExecutorRecifragemDadosSensiveis(
            fabrica.Services.GetRequiredService<IServiceScopeFactory>(),
            fabrica.Services.GetRequiredService<ICifradorDadosSensiveis>(),
            fabrica.Services.GetRequiredService<ICifradorTokenCronograma>(),
            logs,
            tamanhoLote);
    }

    [Fact]
    public async Task ChaveAnterior_DadosGravadosComElaContinuamLegiveis_ENovasGravacoesUsamAAtual()
    {
        var (eventoId, conviteId, convidadoId) = await RegistrarRestricaoAsync(OrganizacaoA.Cliente);
        var token = await GerarLinkCronogramaAsync(OrganizacaoA.Cliente, eventoId);
        var cifraAntiga = await CifraDadosSensiveisAsync(OrganizacaoA, convidadoId);

        var rotacionada = FabricaComChaves(ChaveNova, ChaveAntiga);
        var cliente = ClienteDe(rotacionada, OrganizacaoA);

        var relatorio = await ObterRelatorioAsync(cliente, eventoId);
        var pessoa = Assert.Single(relatorio.Pessoas);
        Assert.Equal(TextoOutra, pessoa.OutraRestricao);
        Assert.Equal(TextoNecessidade, pessoa.NecessidadeEspecial);
        Assert.Equal(0, relatorio.RegistrosIlegiveis);
        Assert.Equal(token, await ObterTokenLinkGeralAsync(cliente, eventoId));

        var regravacao = await cliente.PutAsJsonAsync(
            RotaRestricao(eventoId, conviteId, convidadoId),
            new { tipos = new[] { "Vegana" }, outraRestricao = "Sem mel", consentimentoObtido = true });
        Assert.Equal(HttpStatusCode.OK, regravacao.StatusCode);

        var cifraNova = await CifraDadosSensiveisAsync(OrganizacaoA, convidadoId);
        Assert.NotEqual(cifraAntiga, cifraNova);
        Assert.Contains("Sem mel", CifradorSo(ChaveNova).Decifrar(cifraNova, convidadoId), StringComparison.Ordinal);
        Assert.Null(CifradorSo(ChaveAntiga).Decifrar(cifraNova, convidadoId));
    }

    [Fact]
    public async Task Recifragem_DeveRecifrarTodasAsOrganizacoesEmLotes_SerIdempotente_ELogarSoContagens()
    {
        var registrosA = new[]
        {
            await RegistrarRestricaoAsync(OrganizacaoA.Cliente),
            await RegistrarRestricaoAsync(OrganizacaoA.Cliente, "Sem amendoim"),
            await RegistrarRestricaoAsync(OrganizacaoA.Cliente, "Sem camarão"),
        };
        var registroB = await RegistrarRestricaoAsync(OrganizacaoB.Cliente, "Sem pimenta");
        var tokenA = await GerarLinkCronogramaAsync(OrganizacaoA.Cliente, registrosA[0].EventoId);
        var tokenB = await GerarLinkCronogramaAsync(OrganizacaoB.Cliente, registroB.EventoId);
        var cifraAntigaA = await CifraDadosSensiveisAsync(OrganizacaoA, registrosA[0].ConvidadoId);

        var rotacionada = FabricaComChaves(ChaveNova, ChaveAntiga);
        var logs = new RegistroLogs<ExecutorRecifragemDadosSensiveis>();

        var primeira = await CriarExecutor(rotacionada, logs, tamanhoLote: 2).ExecutarAsync(CancellationToken.None);

        Assert.Equal(new ContagemRecifragem(4, 0, 0, 0), primeira.DadosSensiveis);
        Assert.Equal(new ContagemRecifragem(2, 0, 0, 0), primeira.LinksCronograma);
        Assert.Equal(2, primeira.Organizacoes);
        Assert.False(primeira.PossuiIlegiveis);

        foreach (var (organizacao, convidadoId) in registrosA.Select(registro => (OrganizacaoA, registro.ConvidadoId)).Append((OrganizacaoB, registroB.ConvidadoId)))
        {
            var cifra = await CifraDadosSensiveisAsync(organizacao, convidadoId);
            Assert.StartsWith(CifradorDadosSensiveis.PrefixoVersao, cifra, StringComparison.Ordinal);
            Assert.NotNull(CifradorSo(ChaveNova).Decifrar(cifra, convidadoId));
            Assert.Null(CifradorSo(ChaveAntiga).Decifrar(cifra, convidadoId));
        }

        Assert.NotEqual(cifraAntigaA, await CifraDadosSensiveisAsync(OrganizacaoA, registrosA[0].ConvidadoId));
        Assert.Equal(tokenA, CifradorCronogramaSo(ChaveNova).Decifrar(await CifraLinkAsync(OrganizacaoA, registrosA[0].EventoId), registrosA[0].EventoId));
        Assert.Equal(tokenB, CifradorCronogramaSo(ChaveNova).Decifrar(await CifraLinkAsync(OrganizacaoB, registroB.EventoId), registroB.EventoId));
        Assert.Null(CifradorCronogramaSo(ChaveAntiga).Decifrar(await CifraLinkAsync(OrganizacaoB, registroB.EventoId), registroB.EventoId));

        var cifrasAntesDaSegunda = await CifraDadosSensiveisAsync(OrganizacaoB, registroB.ConvidadoId);
        var segunda = await CriarExecutor(rotacionada, logs, tamanhoLote: 2).ExecutarAsync(CancellationToken.None);

        Assert.Equal(new ContagemRecifragem(0, 4, 0, 0), segunda.DadosSensiveis);
        Assert.Equal(new ContagemRecifragem(0, 2, 0, 0), segunda.LinksCronograma);
        Assert.Equal(cifrasAntesDaSegunda, await CifraDadosSensiveisAsync(OrganizacaoB, registroB.ConvidadoId));

        var so = FabricaComChaves(ChaveNova, null);
        var clienteA = ClienteDe(so, OrganizacaoA);
        var relatorio = await ObterRelatorioAsync(clienteA, registrosA[1].EventoId);
        Assert.Equal("Sem amendoim", Assert.Single(relatorio.Pessoas).OutraRestricao);
        Assert.Equal(0, relatorio.RegistrosIlegiveis);
        Assert.Equal(tokenA, await ObterTokenLinkGeralAsync(clienteA, registrosA[0].EventoId));
        Assert.Equal(ComandosAdministrativos.CodigoSucesso, await ComandosAdministrativos.ExecutarAsync(so.Services, CancellationToken.None));

        var proibidos = new[] { ChaveNova, ChaveAntiga, TextoOutra, TextoNecessidade, "Sem amendoim", tokenA, tokenB, cifraAntigaA, registroB.ConvidadoId.ToString() };
        Assert.NotEmpty(logs.Mensagens);
        Assert.All(logs.Mensagens, mensagem => Assert.DoesNotContain(proibidos, proibido => mensagem.Contains(proibido, StringComparison.Ordinal)));
    }

    [Fact]
    public async Task SemChaveAnterior_ComportamentoAtual_ERecifragemSoContaIlegiveisSemAlterar()
    {
        var (eventoId, _, convidadoId) = await RegistrarRestricaoAsync(OrganizacaoA.Cliente);
        await GerarLinkCronogramaAsync(OrganizacaoA.Cliente, eventoId);
        var cifra = await CifraDadosSensiveisAsync(OrganizacaoA, convidadoId);
        var cifraLink = await CifraLinkAsync(OrganizacaoA, eventoId);

        var semAnterior = FabricaComChaves(ChaveNova, null);
        var cliente = ClienteDe(semAnterior, OrganizacaoA);

        var relatorio = await ObterRelatorioAsync(cliente, eventoId);
        Assert.Equal(1, relatorio.RegistrosIlegiveis);
        Assert.DoesNotContain(relatorio.Pessoas, pessoa => pessoa.OutraRestricao == TextoOutra);
        Assert.Null(await ObterTokenLinkGeralAsync(cliente, eventoId));

        var resultado = await CriarExecutor(semAnterior, new RegistroLogs<ExecutorRecifragemDadosSensiveis>(), ExecutorRecifragemDadosSensiveis.TamanhoLotePadrao)
            .ExecutarAsync(CancellationToken.None);

        Assert.Equal(new ContagemRecifragem(0, 0, 1, 0), resultado.DadosSensiveis);
        Assert.Equal(new ContagemRecifragem(0, 0, 1, 0), resultado.LinksCronograma);
        Assert.True(resultado.PossuiIlegiveis);
        Assert.Equal(cifra, await CifraDadosSensiveisAsync(OrganizacaoA, convidadoId));
        Assert.Equal(cifraLink, await CifraLinkAsync(OrganizacaoA, eventoId));
        Assert.Equal(ComandosAdministrativos.CodigoRegistrosIlegiveis, await ComandosAdministrativos.ExecutarAsync(semAnterior.Services, CancellationToken.None));
    }

    [Theory]
    [InlineData(ChaveAntiga)]
    [InlineData("Y2hhdmUtY3VydGEtZGVtYWlz")]
    [InlineData("nao e base64 !!")]
    public void ChaveAnteriorInvalidaOuIgualAAtual_ApiNaoInicia_SemEcoarValor(string anterior)
    {
        var fabrica = FabricaComChaves(ChaveAntiga, anterior);

        var excecao = Assert.ThrowsAny<Exception>(() => fabrica.CreateClient());
        var mensagens = string.Join(" | ", Encadeadas(excecao).Select(item => item.Message));

        Assert.Contains(OpcoesDadosSensiveis.MensagemChaveAnteriorInvalida, mensagens, StringComparison.Ordinal);
        Assert.DoesNotContain(anterior, mensagens, StringComparison.Ordinal);
        Assert.DoesNotContain(ChaveAntiga, mensagens, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Isolamento_RepositoriosSoListamESubstituemCifrasDaOrganizacaoDoEscopo()
    {
        var registroA = await RegistrarRestricaoAsync(OrganizacaoA.Cliente);
        var registroB = await RegistrarRestricaoAsync(OrganizacaoB.Cliente);
        await GerarLinkCronogramaAsync(OrganizacaoA.Cliente, registroA.EventoId);
        await GerarLinkCronogramaAsync(OrganizacaoB.Cliente, registroB.EventoId);
        var cifraB = await CifraDadosSensiveisAsync(OrganizacaoB, registroB.ConvidadoId);
        var cifraLinkB = await CifraLinkAsync(OrganizacaoB, registroB.EventoId);
        var cifraA = await CifraDadosSensiveisAsync(OrganizacaoA, registroA.ConvidadoId);
        var idLinkB = await IdLinkAsync(OrganizacaoB, registroB.EventoId);

        await using (var contextoA = CriarContexto(OrganizacaoA))
        {
            var dados = new DadosSensiveisRepository(contextoA);
            var acessos = new AcessoCronogramaRepository(contextoA);

            var cifrasDados = await dados.ListarCifrasAsync(null, 50, CancellationToken.None);
            var cifrasLinks = await acessos.ListarCifrasAsync(null, 50, CancellationToken.None);

            Assert.Equal(registroA.ConvidadoId, Assert.Single(cifrasDados).Id);
            Assert.Equal(registroA.EventoId, Assert.Single(cifrasLinks).IdAssociado);
            Assert.Equal(0, await dados.SubstituirCifrasAsync([new SubstituicaoCifra(registroB.ConvidadoId, cifraB, cifraA)], CancellationToken.None));
            Assert.Equal(0, await acessos.SubstituirCifrasAsync([new SubstituicaoCifra(idLinkB, cifraLinkB, "x")], CancellationToken.None));
            Assert.Equal(0, await dados.SubstituirCifrasAsync([new SubstituicaoCifra(registroA.ConvidadoId, "v1.conteudo-desatualizado", cifraB)], CancellationToken.None));
        }

        await using (var contextoSemOrganizacao = CriarContextoSemOrganizacao())
        {
            Assert.Empty(await new DadosSensiveisRepository(contextoSemOrganizacao).ListarCifrasAsync(null, 50, CancellationToken.None));
            Assert.Empty(await new AcessoCronogramaRepository(contextoSemOrganizacao).ListarCifrasAsync(null, 50, CancellationToken.None));
        }

        Assert.Equal(cifraB, await CifraDadosSensiveisAsync(OrganizacaoB, registroB.ConvidadoId));
        Assert.Equal(cifraLinkB, await CifraLinkAsync(OrganizacaoB, registroB.EventoId));
        Assert.Equal(cifraA, await CifraDadosSensiveisAsync(OrganizacaoA, registroA.ConvidadoId));
    }

    [Fact]
    public void ComandoAdministrativo_NaoTemRotaHttp()
    {
        var fontes = Fabrica.Services.GetRequiredService<IEnumerable<Microsoft.AspNetCore.Routing.EndpointDataSource>>();
        var rotas = fontes.SelectMany(fonte => fonte.Endpoints).Select(endpoint => endpoint.DisplayName ?? string.Empty);

        Assert.DoesNotContain(rotas, rota => rota.Contains("recifr", StringComparison.OrdinalIgnoreCase));
        Assert.Null(Fabrica.Services.GetRequiredService<IConfiguration>()["DadosSensiveis:ChaveCifragemAnterior"]);
    }

    private async Task<Guid> IdLinkAsync(OrganizacaoTeste organizacao, Guid eventoId)
    {
        await using var contexto = CriarContexto(organizacao);
        return (await contexto.AcessosCronograma.AsNoTracking().SingleAsync(acesso => acesso.EventoId == eventoId)).Id;
    }

    private static IEnumerable<Exception> Encadeadas(Exception excecao)
    {
        for (var atual = excecao; atual is not null; atual = atual.InnerException)
        {
            yield return atual;

            if (atual is AggregateException agregada)
            {
                foreach (var interna in agregada.InnerExceptions.SelectMany(Encadeadas))
                {
                    yield return interna;
                }
            }
        }
    }

    private sealed class RegistroLogs<T> : ILogger<T>
    {
        private readonly ConcurrentQueue<string> _mensagens = new();

        public IReadOnlyCollection<string> Mensagens => _mensagens;

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
            _mensagens.Enqueue(formatter(state, exception));
        }
    }
}
