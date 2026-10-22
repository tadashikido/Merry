using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Casamentos;
using Celebri.Aplicacao.Confirmacoes;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;
using static Celebri.Testes.Integracao.Rsvp.ClienteRsvp;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;

namespace Celebri.Testes.Integracao.Confirmacoes;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class PainelConfirmacoesApiTestes : IsolamentoOrganizacaoTestesBase
{
    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    public PainelConfirmacoesApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static string RotaPainel(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/painel-confirmacoes";
    }

    private static string RotaExportacao(Guid casamentoId, string? formato = "csv")
    {
        var rota = $"/api/casamentos/{casamentoId}/exportacao-buffet";
        return formato is null ? rota : $"{rota}?formato={formato}";
    }

    private static async Task<PainelConfirmacoesDto> ObterPainelAsync(HttpClient cliente, Guid casamentoId)
    {
        var resposta = await cliente.GetAsync(RotaPainel(casamentoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.True(resposta.Headers.CacheControl?.NoStore);
        return (await resposta.Content.ReadFromJsonAsync<PainelConfirmacoesDto>(OpcoesJson))!;
    }

    private static async Task<(ExportacaoBuffetDto Exportacao, string Json)> ExportarAsync(HttpClient cliente, Guid casamentoId, string formato = "csv")
    {
        var resposta = await cliente.GetAsync(RotaExportacao(casamentoId, formato));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.True(resposta.Headers.CacheControl?.NoStore);
        var json = await resposta.Content.ReadAsStringAsync();
        return (JsonSerializer.Deserialize<ExportacaoBuffetDto>(json, OpcoesJson)!, json);
    }

    private sealed record Cenario(CasamentoDto Casamento, ConviteDto Souza, ConviteDto Lima, ConviteDto Rocha, string TokenSouza);

    private async Task<Cenario> CriarCenarioAsync(OrganizacaoTeste organizacao)
    {
        var cliente = organizacao.Cliente;
        var casamento = await ClienteCasamentos.CriarAsync(cliente, ClienteCasamentos.CorpoValido(data: "2027-05-22", convidadosEstimados: 150));

        var souza = await ClienteConvites.CriarAsync(cliente, casamento.Id, ClienteConvites.CorpoValido(
            "Família Souza",
            "Família da noiva",
            1,
            ClienteConvites.Pessoa("Célia Souza", "(11) 98765-4321", "celia@exemplo.com"),
            ClienteConvites.Pessoa("Lia Souza", null, null, "Crianca")));
        var lima = await ClienteConvites.CriarAsync(cliente, casamento.Id, ClienteConvites.CorpoValido(
            "Família Lima",
            "Amigos",
            0,
            ClienteConvites.Pessoa("Rafael Lima", "(21) 91234-5678", null, "Adulto", "Confirmado"),
            ClienteConvites.Pessoa("Bia Lima", null, null)));
        var rocha = await ClienteConvites.CriarAsync(cliente, casamento.Id, ClienteConvites.CorpoValido(
            "Caio Rocha",
            null,
            0,
            ClienteConvites.Pessoa("Caio Rocha", null, null, "Adulto", "Recusado")));

        var link = await GerarLinkAsync(cliente, casamento.Id, souza.Id);
        var resposta = await cliente.PostAsync(RotaEnvio(casamento.Id, lima.Id), null);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);

        var resposta2 = await ResponderAsync(
            ClienteAnonimo,
            link.Token,
            [(souza.Convidados[0].Id, "Confirmado"), (souza.Convidados[1].Id, "Confirmado")],
            Acompanhante("Pedro Lima"));
        Assert.Equal(HttpStatusCode.OK, resposta2.StatusCode);

        return new Cenario(casamento, souza, lima, rocha, link.Token);
    }

    [Fact]
    public async Task Painel_NumerosDevemBaterComAListaDeConvidados()
    {
        var cenario = await CriarCenarioAsync(OrganizacaoA);

        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Casamento.Id);
        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, cenario.Casamento.Id);
        var totais = await OrganizacaoA.Cliente.GetFromJsonAsync<TotaisConvidadosDto>($"{ClienteConvites.Rota(cenario.Casamento.Id)}/totais", OpcoesJson);

        Assert.Equal(lista.Totais, painel.Pessoas);
        Assert.Equal(totais, painel.Pessoas);
        Assert.Equal(lista.Convites.Count, painel.Convites.Total);
        Assert.Equal(lista.Convites.Count(convite => convite.StatusEnvio == "NaoEnviado"), painel.Convites.NaoEnviados);
        Assert.Equal(lista.Convites.Count(convite => convite.StatusEnvio == "Enviado"), painel.Convites.Enviados);
        Assert.Equal(lista.Convites.Count(convite => convite.StatusEnvio == "Visualizado"), painel.Convites.Visualizados);
        Assert.Equal(lista.Convites.Count(convite => convite.Convidados.All(pessoa => pessoa.Resposta != "Pendente")), painel.Convites.Respondidos);
        Assert.Equal(
            lista.Convites.Where(convite => convite.Convidados.Any(pessoa => pessoa.Resposta == "Pendente")).Select(convite => convite.Id),
            painel.Pendentes.Select(pendente => pendente.ConviteId));

        Assert.Equal(new SituacaoConvitesDto(3, 1, 1, 1, 2, 1), painel.Convites);
        Assert.Equal(new TotaisPorFaixaDto(3, 1, 4), painel.Pessoas.Confirmados);
        Assert.Equal(new TotaisPorFaixaDto(1, 0, 1), painel.Pessoas.Pendentes);
        Assert.Equal(new TotaisPorFaixaDto(1, 0, 1), painel.Pessoas.Recusados);
        Assert.Equal(150, painel.ConvidadosEstimados);
        Assert.Equal(new DateOnly(2027, 5, 12), painel.Prazo.DataLimite);
        Assert.Equal(new DateOnly(2027, 5, 12).DayNumber - ClienteCasamentos.HojeEmSaoPaulo().DayNumber, painel.Prazo.DiasRestantes);

        var pendente = Assert.Single(painel.Pendentes);
        Assert.Equal("Família Lima", pendente.Nome);
        Assert.Equal("Enviado", pendente.StatusEnvio);
        Assert.Equal(["Bia Lima"], pendente.PessoasPendentes);
        Assert.Equal(2, pendente.TotalPessoas);
        Assert.NotNull(pendente.Telefone);
    }

    [Fact]
    public async Task Painel_SemConvites_DeveZerar()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(convidadosEstimados: null));

        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, casamento.Id);

        Assert.Equal(new SituacaoConvitesDto(0, 0, 0, 0, 0, 0), painel.Convites);
        Assert.Null(painel.ConvidadosEstimados);
        Assert.Empty(painel.Pendentes);
    }

    [Fact]
    public async Task PainelEExportacao_SemAutenticacao_DevemResponder401()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaPainel(casamento.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaExportacao(casamento.Id))).StatusCode);
    }

    [Fact]
    public async Task PainelEExportacao_DeOutraOrganizacao_DevemResponder404()
    {
        var cenario = await CriarCenarioAsync(OrganizacaoA);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPainel(cenario.Casamento.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaExportacao(cenario.Casamento.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaExportacao(cenario.Casamento.Id, "impressao")));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("pdf")]
    [InlineData("0")]
    public async Task Exportacao_FormatoInvalido_DeveResponder400(string? formato)
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.GetAsync(RotaExportacao(casamento.Id, formato));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Exportacao_DeveTrazerSoConfirmadosPorConviteSemDadosDeContato()
    {
        var cenario = await CriarCenarioAsync(OrganizacaoA);
        var lia = cenario.Souza.Convidados[1];
        var restricao = await ClienteAnonimo.PutAsJsonAsync(RotaResposta, new
        {
            token = cenario.TokenSouza,
            pessoas = new object[]
            {
                new { id = cenario.Souza.Convidados[0].Id, resposta = "Confirmado" },
                new { id = lia.Id, resposta = "Confirmado", restricao = new { tipos = new[] { "SemGluten" }, outraRestricao = "sem porco", necessidadeEspecial = (string?)null } },
            },
            acompanhantes = new[] { Acompanhante("Pedro Lima") },
            consentimento = new { aceito = true, versaoTermo = TermoPrivacidadeRsvp.VersaoVigente },
        });
        Assert.Equal(HttpStatusCode.OK, restricao.StatusCode);

        foreach (var formato in new[] { "csv", "impressao" })
        {
            var (exportacao, json) = await ExportarAsync(OrganizacaoA.Cliente, cenario.Casamento.Id, formato);

            Assert.Equal(new ContagemBuffetDto(3, 1, 4), exportacao.Confirmados);
            Assert.Equal(1, exportacao.Pendentes);
            Assert.Equal(["Família Lima", "Família Souza"], exportacao.Convites.Select(convite => convite.Nome));
            Assert.Equal(["Rafael Lima"], exportacao.Convites[0].Pessoas.Select(pessoa => pessoa.Nome));
            Assert.Equal(["Célia Souza", "Lia Souza", "Pedro Lima"], exportacao.Convites[1].Pessoas.Select(pessoa => pessoa.Nome));
            Assert.True(exportacao.Convites[1].Pessoas[2].Acompanhante);
            Assert.Equal("Crianca", exportacao.Convites[1].Pessoas[1].FaixaEtaria);
            Assert.Equal(["SemGluten"], exportacao.Convites[1].Pessoas[1].Tipos);

            var pessoaRestricao = Assert.Single(exportacao.Restricoes.Pessoas);
            Assert.Equal("Lia Souza", pessoaRestricao.Nome);
            Assert.Equal("Família Souza", pessoaRestricao.Convite);
            Assert.Equal("sem porco", pessoaRestricao.OutraRestricao);
            Assert.Equal([new ContagemRestricaoBuffetDto("SemGluten", 1)], exportacao.Restricoes.PorTipo);
            Assert.Equal("Espaço Jardim", exportacao.Casamento.LocalRecepcao);

            Assert.DoesNotContain("98765", json, StringComparison.Ordinal);
            Assert.DoesNotContain("91234", json, StringComparison.Ordinal);
            Assert.DoesNotContain("exemplo.com", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("telefone", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("email", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Família da noiva", json, StringComparison.Ordinal);
            Assert.DoesNotContain("Amigos", json, StringComparison.Ordinal);
            Assert.DoesNotContain("Caio Rocha", json, StringComparison.Ordinal);
            Assert.DoesNotContain("Bia Lima", json, StringComparison.Ordinal);
            Assert.DoesNotContain(lia.Id.ToString(), json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("origemConsentimento", json, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Exportacao_DeveRegistrarTrilhaSemConteudoPessoal()
    {
        var provedor = new ProvedorLogsMemoria();
        await using var fabricaComLogs = Fabrica.WithWebHostBuilder(builder => builder.ConfigureLogging(logging => logging.AddProvider(provedor)));
        using var cliente = fabricaComLogs.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", OrganizacaoA.TokenAcesso);
        cliente.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");
        var cenario = await CriarCenarioAsync(OrganizacaoA);

        await ExportarAsync(cliente, cenario.Casamento.Id, "impressao");
        await OrganizacaoB.Cliente.GetAsync(RotaExportacao(cenario.Casamento.Id));

        var trilha = Assert.Single(provedor.Mensagens, mensagem => mensagem.Contains("Exportação para o buffet gerada", StringComparison.Ordinal));
        Assert.Contains(cenario.Casamento.Id.ToString(), trilha, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(OrganizacaoA.UsuarioId.ToString(), trilha, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Impressao", trilha, StringComparison.Ordinal);
        Assert.Contains("4 pessoas confirmadas", trilha, StringComparison.Ordinal);
        Assert.DoesNotContain(provedor.Mensagens, mensagem => mensagem.Contains("Célia", StringComparison.Ordinal)
            || mensagem.Contains("Souza", StringComparison.Ordinal)
            || mensagem.Contains("98765", StringComparison.Ordinal));
    }

    [Fact]
    public async Task CasamentoArquivado_DevePermitirConsultarEExportar()
    {
        var cenario = await CriarCenarioAsync(OrganizacaoA);
        var arquivar = await OrganizacaoA.Cliente.PostAsync($"/api/casamentos/{cenario.Casamento.Id}/arquivar", null);
        Assert.Equal(HttpStatusCode.OK, arquivar.StatusCode);

        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, cenario.Casamento.Id);
        var (exportacao, _) = await ExportarAsync(OrganizacaoA.Cliente, cenario.Casamento.Id);

        Assert.True(painel.CasamentoArquivado);
        Assert.False(painel.Prazo.AceitaRespostas);
        Assert.Equal(4, exportacao.Confirmados.Total);
    }

    [Fact]
    public async Task ConsultaRsvp_PelaEquipeDaMesmaOrganizacao_NaoDeveMarcarVisualizado()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var link = await GerarLinkAsync(OrganizacaoA.Cliente, casamento.Id, convite.Id);

        var previa = await ConsultarComSucessoAsync(OrganizacaoA.Cliente, link.Token);

        Assert.True(previa.PreVisualizacao);
        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(1, painel.Convites.NaoEnviados);
        Assert.Equal(0, painel.Convites.Visualizados);
    }

    [Fact]
    public async Task ConsultaRsvp_PorAnonimo_DeveMarcarVisualizado()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var link = await GerarLinkAsync(OrganizacaoA.Cliente, casamento.Id, convite.Id);

        var consulta = await ConsultarComSucessoAsync(ClienteAnonimo, link.Token);

        Assert.False(consulta.PreVisualizacao);
        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(1, painel.Convites.Visualizados);
    }

    [Fact]
    public async Task ConsultaRsvp_PorUsuarioDeOutraOrganizacao_DeveMarcarVisualizado()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var link = await GerarLinkAsync(OrganizacaoA.Cliente, casamento.Id, convite.Id);

        var consulta = await ConsultarComSucessoAsync(OrganizacaoB.Cliente, link.Token);

        Assert.False(consulta.PreVisualizacao);
        Assert.Equal("Família Souza", consulta.NomeConvite);
        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(1, painel.Convites.Visualizados);
    }

    [Fact]
    public async Task ConsultaRsvp_ComTokenDeAcessoInvalido_DeveSerTratadaComoAnonima()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var link = await GerarLinkAsync(OrganizacaoA.Cliente, casamento.Id, convite.Id);
        using var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "token.invalido.qualquer");

        var consulta = await ConsultarComSucessoAsync(cliente, link.Token);

        Assert.False(consulta.PreVisualizacao);
        var painel = await ObterPainelAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(1, painel.Convites.Visualizados);
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
