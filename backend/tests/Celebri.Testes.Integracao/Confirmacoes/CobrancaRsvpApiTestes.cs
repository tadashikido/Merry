using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Confirmacoes;
using Celebri.Aplicacao.Convidados;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Rsvp;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using static Celebri.Testes.Integracao.Rsvp.ClienteRsvp;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;

namespace Celebri.Testes.Integracao.Confirmacoes;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class CobrancaRsvpApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    private readonly List<HttpClient> _clientesAnfitriao = [];

    public CobrancaRsvpApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesAnfitriao)
        {
            cliente.Dispose();
        }
    }

    private static string RotaCobranca(Guid eventoId, Guid conviteId)
    {
        return $"{ClienteConvites.Rota(eventoId, conviteId)}/cobranca";
    }

    private static string RotaPainel(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/painel-confirmacoes";
    }

    private static async Task<PainelConfirmacoesDto> ObterPainelAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(RotaPainel(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<PainelConfirmacoesDto>(OpcoesJson))!;
    }

    private static async Task<string?> LerDetalheAsync(HttpResponseMessage resposta)
    {
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        return json.RootElement.TryGetProperty("detail", out var detalhe) ? detalhe.GetString() : null;
    }

    private sealed record Cenario(EventoDto Evento, ConviteDto Convite, string Token);

    private static async Task<Cenario> CriarEnviadoComLinkAsync(HttpClient cliente, object? corpoEvento = null)
    {
        var evento = await ClienteEventos.CriarAsync(cliente, corpoEvento);
        var convite = await ClienteConvites.CriarAsync(cliente, evento.Id);
        var link = await GerarLinkAsync(cliente, evento.Id, convite.Id);
        var envio = await cliente.PostAsync(RotaEnvio(evento.Id, convite.Id), null);
        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        return new Cenario(evento, convite, link.Token);
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
        _clientesAnfitriao.Add(cliente);
        return cliente;
    }

    [Fact]
    public async Task Registrar_ConviteEnviadoComLink_DeveGravarEAparecerNoPainel()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);

        var antes = Assert.Single((await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Evento.Id)).Pendentes);
        Assert.True(antes.Cobravel);
        Assert.Null(antes.UltimaCobrancaEm);
        Assert.Equal(0, antes.QuantidadeCobrancas);

        var primeira = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);
        var segunda = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.OK, primeira.StatusCode);
        Assert.True(primeira.Headers.CacheControl?.NoStore);
        Assert.Equal(HttpStatusCode.OK, segunda.StatusCode);
        var dto = (await segunda.Content.ReadFromJsonAsync<CobrancaRsvpDto>(OpcoesJson))!;
        Assert.Equal(cenario.Convite.Id, dto.ConviteId);
        Assert.Equal(2, dto.QuantidadeCobrancas);
        Assert.True(DateTimeOffset.UtcNow - dto.UltimaCobrancaEm < TimeSpan.FromMinutes(5));

        var depois = Assert.Single((await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Evento.Id)).Pendentes);
        Assert.True(depois.Cobravel);
        Assert.Equal(2, depois.QuantidadeCobrancas);
        Assert.NotNull(depois.UltimaCobrancaEm);
        Assert.Equal("Enviado", depois.StatusEnvio);
    }

    [Fact]
    public async Task Registrar_ConviteNaoEnviado_DeveRetornar422ESerNaoCobravel()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        await GerarLinkAsync(OrganizacaoA.Cliente, evento.Id, convite.Id);

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(evento.Id, convite.Id), null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensConvidados.ConviteNaoCobravel, await LerDetalheAsync(resposta));
        Assert.False(Assert.Single((await ObterPainelAsync(OrganizacaoA.Cliente, evento.Id)).Pendentes).Cobravel);
    }

    [Fact]
    public async Task Registrar_LinkRevogado_DeveRetornar422ESerNaoCobravel()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);
        var revogacao = await OrganizacaoA.Cliente.DeleteAsync(RotaLink(cenario.Evento.Id, cenario.Convite.Id));
        Assert.Equal(HttpStatusCode.NoContent, revogacao.StatusCode);

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensConvidados.CobrancaSemLink, await LerDetalheAsync(resposta));
        Assert.False(Assert.Single((await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Evento.Id)).Pendentes).Cobravel);
    }

    [Fact]
    public async Task Registrar_ConviteRespondido_DeveRetornar422ESairDosPendentes()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);
        var respostaRsvp = await ResponderAsync(
            ClienteAnonimo,
            cenario.Token,
            cenario.Convite.Convidados.Select(pessoa => (pessoa.Id, "Confirmado")));
        Assert.Equal(HttpStatusCode.OK, respostaRsvp.StatusCode);

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensConvidados.ConviteNaoCobravel, await LerDetalheAsync(resposta));
        Assert.Empty((await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Evento.Id)).Pendentes);
    }

    [Fact]
    public async Task Registrar_PrazoEncerrado_DeveRetornar422ENinguemCobravel()
    {
        var hoje = ClienteEventos.HojeEmSaoPaulo();
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente, new
        {
            tipo = "Casamento",
            nomePrimeiraPessoa = "Ana Beatriz",
            nomeSegundaPessoa = "Bruno",
            data = hoje.AddDays(30).ToString("yyyy-MM-dd"),
            dataLimiteRsvp = hoje.AddDays(-1).ToString("yyyy-MM-dd"),
        });

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensConvidados.CobrancaPrazoEncerrado, await LerDetalheAsync(resposta));
        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Evento.Id);
        Assert.False(painel.Prazo.AceitaRespostas);
        Assert.All(painel.Pendentes, pendente => Assert.False(pendente.Cobravel));
    }

    [Fact]
    public async Task Registrar_EventoArquivado_DeveRetornar422()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);
        var arquivamento = await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{cenario.Evento.Id}/arquivar", null);
        Assert.True(arquivamento.IsSuccessStatusCode);

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensRsvp.EventoArquivado, await LerDetalheAsync(resposta));
    }

    [Fact]
    public async Task Registrar_PorOutraOrganizacao_DeveRetornar404SemAlterar()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoB.Cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        var convite = await contexto.Convites.SingleAsync(registro => registro.Id == cenario.Convite.Id);
        Assert.Equal(0, convite.QuantidadeCobrancas);
        Assert.Null(convite.UltimaCobrancaEm);
    }

    [Fact]
    public async Task Registrar_ConviteDeOutroEvento_DeveRetornar404()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaCobranca(outro.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
    }

    [Fact]
    public async Task Registrar_SemAutenticacao_DeveRetornar401()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);

        var resposta = await ClienteAnonimo.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Registrar_PeloAnfitriao_DeveGravarNoProprioEventoENaoEmOutro()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);
        var outro = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);
        var anfitriao = await CriarClienteAnfitriaoAsync(cenario.Evento.Id);

        var proprio = await anfitriao.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);
        var alheio = await anfitriao.PostAsync(RotaCobranca(outro.Evento.Id, outro.Convite.Id), null);

        Assert.Equal(HttpStatusCode.OK, proprio.StatusCode);
        Assert.Equal(1, (await proprio.Content.ReadFromJsonAsync<CobrancaRsvpDto>(OpcoesJson))!.QuantidadeCobrancas);
        Assert.Contains(alheio.StatusCode, new[] { HttpStatusCode.NotFound, HttpStatusCode.Forbidden });
        Assert.True(Assert.Single((await ObterPainelAsync(anfitriao, cenario.Evento.Id)).Pendentes).Cobravel);
    }

    [Fact]
    public async Task Registrar_DeveRegistrarTrilhaSemTokenNemTelefone()
    {
        var provedor = new ProvedorLogsMemoria();
        await using var fabricaComLogs = Fabrica.WithWebHostBuilder(builder => builder.ConfigureLogging(logging => logging.AddProvider(provedor)));
        using var cliente = fabricaComLogs.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", OrganizacaoA.TokenAcesso);
        cliente.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");
        var cenario = await CriarEnviadoComLinkAsync(cliente);

        var resposta = await cliente.PostAsync(RotaCobranca(cenario.Evento.Id, cenario.Convite.Id), null);
        await cliente.GetAsync(RotaPainel(cenario.Evento.Id));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var trilha = Assert.Single(provedor.Mensagens, mensagem => mensagem.Contains("Cobrança de RSVP registrada", StringComparison.Ordinal));
        Assert.Contains(cenario.Evento.Id.ToString(), trilha, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(cenario.Convite.Id.ToString(), trilha, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(OrganizacaoA.UsuarioId.ToString(), trilha, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(provedor.Mensagens, mensagem => mensagem.Contains(cenario.Token, StringComparison.Ordinal)
            || mensagem.Contains("98765", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Painel_NaoDeveExporTokenDoRsvp()
    {
        var cenario = await CriarEnviadoComLinkAsync(OrganizacaoA.Cliente);

        var json = await OrganizacaoA.Cliente.GetStringAsync(RotaPainel(cenario.Evento.Id));

        Assert.DoesNotContain(cenario.Token, json, StringComparison.Ordinal);
        Assert.Contains("\"cobravel\":true", json, StringComparison.Ordinal);
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
                ArgumentNullException.ThrowIfNull(formatter);
                _mensagens.Enqueue(formatter(state, exception));
            }
        }
    }
}
