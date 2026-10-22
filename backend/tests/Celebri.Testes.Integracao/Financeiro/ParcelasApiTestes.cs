using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Financeiro;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.FornecedoresCasamento;
using Celebri.Dominio.Financeiro;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoCasal = Celebri.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Financeiro;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ParcelasApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private static readonly byte[] PdfValido = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj << >> endobj\ntrailer\n%%EOF");
    private static readonly byte[] PngValido = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];

    private readonly List<HttpClient> _clientesCasal = [];
    private readonly DateOnly _hoje = ClienteCasamentos.HojeEmSaoPaulo();

    public ParcelasApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesCasal)
        {
            cliente.Dispose();
        }
    }

    private static string RotaParcelas(Guid casamentoId, Guid vinculoId, Guid? parcelaId = null, string? acao = null)
    {
        var baseRota = $"/api/casamentos/{casamentoId}/fornecedores/{vinculoId}/parcelas";
        var comParcela = parcelaId is null ? baseRota : $"{baseRota}/{parcelaId}";
        return acao is null ? comParcela : $"{comParcela}/{acao}";
    }

    private static string RotaFinanceiro(Guid casamentoId) => $"/api/casamentos/{casamentoId}/financeiro";

    private static object Parcela(decimal valor, DateOnly vencimento, string? observacao = null) =>
        new { valor, vencimento = vencimento.ToString("yyyy-MM-dd"), observacao };

    private static async Task<ProblemDetails> ProblemaAsync(HttpResponseMessage resposta) =>
        (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;

    private static async Task<string?> CampoAsync(HttpResponseMessage resposta)
    {
        var problema = await ProblemaAsync(resposta);
        return problema.Extensions.TryGetValue("campo", out var campo) ? campo?.ToString() : null;
    }

    private string[] ArquivosNoDisco() =>
        Directory.Exists(Fabrica.DiretorioArquivos)
            ? Directory.GetFiles(Fabrica.DiretorioArquivos, "*", SearchOption.AllDirectories)
            : [];

    private static async Task<(Guid CasamentoId, Guid VinculoId)> CenarioAsync(
        HttpClient cliente,
        decimal contratado = 18_500m,
        string status = "Contratado",
        Guid? casamentoExistente = null,
        string nomeFornecedor = "Buffet São João",
        string categoria = "Buffet")
    {
        var casamentoId = casamentoExistente ?? (await ClienteCasamentos.CriarAsync(cliente)).Id;
        var fornecedorResposta = await cliente.PostAsJsonAsync("/api/fornecedores", new
        {
            categoria,
            nomeEmpresa = nomeFornecedor,
            responsavel = "Marta",
            telefone = "(11) 98765-4321",
            email = (string?)null,
            site = (string?)null,
            instagram = (string?)null,
            observacoes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.Created, fornecedorResposta.StatusCode);
        var fornecedor = (await fornecedorResposta.Content.ReadFromJsonAsync<FornecedorDto>())!;
        var vinculoResposta = await cliente.PostAsJsonAsync($"/api/casamentos/{casamentoId}/fornecedores", new
        {
            fornecedorId = fornecedor.Id,
            servico = "Jantar",
            valorOrcado = contratado,
            valorContratado = status == "Contratado" ? contratado : (decimal?)null,
            status,
            notasInternas = "Comissão",
        });
        Assert.Equal(HttpStatusCode.Created, vinculoResposta.StatusCode);
        var vinculo = (await vinculoResposta.Content.ReadFromJsonAsync<FornecedorCasamentoDto>())!;
        return (casamentoId, vinculo.Id);
    }

    private static async Task<ParcelaDto> CriarParcelaAsync(HttpClient cliente, Guid casamentoId, Guid vinculoId, decimal valor, DateOnly vencimento)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(valor, vencimento));
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ParcelaDto>())!;
    }

    private static Task<HttpResponseMessage> EnviarComprovanteAsync(
        HttpClient cliente,
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        byte[] conteudo,
        string nome,
        string tipo = "application/octet-stream")
    {
        var formulario = new MultipartFormDataContent();
        var arquivo = new ByteArrayContent(conteudo);
        arquivo.Headers.ContentType = new MediaTypeHeaderValue(tipo);
        formulario.Add(arquivo, "arquivo", nome);
        return cliente.PutAsync(RotaParcelas(casamentoId, vinculoId, parcelaId, "comprovante"), formulario);
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
        _clientesCasal.Add(cliente);
        return cliente;
    }

    [Fact]
    public async Task Gerar_DeveCriarParcelasComCentavosNaUltimaEMesesCurtos()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            RotaParcelas(casamentoId, vinculoId, acao: "geracao"),
            new { quantidade = 3, valorTotal = (decimal?)null, primeiroVencimento = "2027-01-31", observacao = "Boleto" });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var cronograma = (await resposta.Content.ReadFromJsonAsync<CronogramaParcelasDto>())!;
        Assert.Equal([6_166.66m, 6_166.66m, 6_166.68m], cronograma.Parcelas.Select(parcela => parcela.Valor));
        Assert.Equal([new DateOnly(2027, 1, 31), new DateOnly(2027, 2, 28), new DateOnly(2027, 3, 31)], cronograma.Parcelas.Select(parcela => parcela.Vencimento));
        Assert.Equal(0m, cronograma.SaldoAParcelar);
        Assert.All(cronograma.Parcelas, parcela => Assert.Equal(3, parcela.TotalParcelas));

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravadas = await contexto.ParcelasFornecedor.Where(parcela => parcela.FornecedorCasamentoId == vinculoId).ToListAsync();
        Assert.Equal(18_500m, gravadas.Sum(parcela => parcela.Valor));
        Assert.All(gravadas, parcela => Assert.Equal(OrganizacaoA.OrganizacaoId, parcela.OrganizacaoId));
    }

    [Fact]
    public async Task Criar_ComSomaAcimaDoContratado_DeveRetornar422NoCampoValor()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente, contratado: 10_000m);
        await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 9_000m, _hoje.AddDays(10));

        var excede = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(1_500m, _hoje.AddDays(40)));
        var cabe = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(500m, _hoje.AddDays(40)));
        var invalida = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(0.001m, _hoje));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, excede.StatusCode);
        var problema = await ProblemaAsync(excede);
        Assert.Equal("valor", problema.Extensions["campo"]?.ToString());
        Assert.Equal(MensagensFinanceiro.SomaExcede("R$ 500,00"), problema.Detail);
        Assert.Equal(HttpStatusCode.Created, cabe.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, invalida.StatusCode);
    }

    [Fact]
    public async Task Criar_EmFornecedorEmCotacao_DeveRetornar422()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente, status: "Cotacao");

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(10m, _hoje));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensFinanceiro.VinculoNaoContratado, (await ProblemaAsync(resposta)).Detail);
    }

    [Fact]
    public async Task Financeiro_DeveSepararVencidasEProximasECalcularTotais()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);
        var vencida = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 3_250m, _hoje.AddDays(-1));
        await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 3_250m, _hoje.AddDays(7));
        var paga = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 6_000m, _hoje.AddDays(-30));
        var pagamento = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaParcelas(casamentoId, vinculoId, paga.Id, "pagamento"), new { pagaEm = (string?)null });
        Assert.Equal(HttpStatusCode.OK, pagamento.StatusCode);

        var financeiro = (await OrganizacaoA.Cliente.GetFromJsonAsync<FinanceiroCasamentoDto>(RotaFinanceiro(casamentoId)))!;

        Assert.Equal(_hoje, financeiro.Hoje);
        Assert.False(financeiro.SomenteLeitura);
        Assert.Equal(new TotaisAlertasDto(1, 3_250m, 1, 3_250m), financeiro.Alertas);
        Assert.Equal(6_000m, financeiro.Resumo.TotalPago);
        Assert.Equal(12_500m, financeiro.Resumo.TotalPendente);
        Assert.Equal(3_250m, financeiro.Resumo.TotalVencido);
        var fornecedor = Assert.Single(financeiro.Fornecedores);
        Assert.Equal(6_000m, fornecedor.SaldoAParcelar);
        Assert.Equal([1, 2, 3], fornecedor.Parcelas.Select(parcela => parcela.Numero));
        Assert.Equal(paga.Id, fornecedor.Parcelas[0].Id);
        Assert.Equal("Vencida", fornecedor.Parcelas.Single(parcela => parcela.Id == vencida.Id).Situacao);

        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<ListaFornecedoresCasamentoDto>($"/api/casamentos/{casamentoId}/fornecedores"))!;
        Assert.Equal(6_000m, lista.Resumo.TotalPago);
        Assert.Equal(3, lista.Vinculos.Single().Parcelas!.Quantidade);
        Assert.Equal(1, lista.Vinculos.Single().Parcelas!.Vencidas);
    }

    [Fact]
    public async Task Pagamento_ComComprovanteImagemEDesfazer_DeveGravarEApagarDoDisco()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);
        var parcela = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 1_000m, _hoje);

        var semPagamento = await EnviarComprovanteAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, parcela.Id, PngValido, "pix.png");
        var futura = await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"),
            new { pagaEm = _hoje.AddDays(1).ToString("yyyy-MM-dd") });
        var pagamento = await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"),
            new { pagaEm = _hoje.ToString("yyyy-MM-dd") });
        var envio = await EnviarComprovanteAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, parcela.Id, PngValido, "pix.png", "application/pdf");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, semPagamento.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, futura.StatusCode);
        Assert.Equal("pagaEm", await CampoAsync(futura));
        Assert.Equal(HttpStatusCode.OK, pagamento.StatusCode);
        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        var comComprovante = (await envio.Content.ReadFromJsonAsync<ParcelaDto>())!;
        Assert.Equal("image/png", comComprovante.Comprovante!.TipoConteudo);
        Assert.Equal("pix.png", comComprovante.Comprovante.NomeArquivo);
        Assert.Single(ArquivosNoDisco());

        var download = await OrganizacaoA.Cliente.GetAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "comprovante"));
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/png", download.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition!.DispositionType);
        Assert.True(download.Headers.CacheControl!.NoStore);
        Assert.Contains("nosniff", download.Headers.GetValues("X-Content-Type-Options"));
        Assert.Equal(PngValido, await download.Content.ReadAsByteArrayAsync());

        var remover = await OrganizacaoA.Cliente.DeleteAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id));
        var desfazer = await OrganizacaoA.Cliente.DeleteAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, remover.StatusCode);
        Assert.Equal(MensagensFinanceiro.ParcelaPagaSemEdicao, (await ProblemaAsync(remover)).Detail);
        Assert.Equal(HttpStatusCode.OK, desfazer.StatusCode);
        var desfeita = (await desfazer.Content.ReadFromJsonAsync<ParcelaDto>())!;
        Assert.Equal("Pendente", desfeita.Situacao);
        Assert.Null(desfeita.Comprovante);
        Assert.Empty(ArquivosNoDisco());
        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id))).StatusCode);
    }

    [Fact]
    public async Task Comprovante_ComFormatoFalsoOuGrandeDemais_DeveSerRecusadoSemGravar()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);
        var parcela = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 1_000m, _hoje);
        await OrganizacaoA.Cliente.PutAsJsonAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"), new { pagaEm = (string?)null });
        var grandeDemais = new byte[(10 * 1024 * 1024) + 10];
        PdfValido.CopyTo(grandeDemais, 0);

        var executavel = await EnviarComprovanteAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, parcela.Id, Encoding.ASCII.GetBytes("MZ executavel"), "recibo.pdf", "application/pdf");
        var svg = await EnviarComprovanteAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, parcela.Id, Encoding.UTF8.GetBytes("<svg><script>alert(1)</script></svg>"), "recibo.png", "image/png");
        var grande = await EnviarComprovanteAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, parcela.Id, grandeDemais, "recibo.pdf", "application/pdf");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, executavel.StatusCode);
        Assert.Equal(MensagensFinanceiro.ComprovanteFormatoInvalido, (await ProblemaAsync(executavel)).Detail);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, svg.StatusCode);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, grande.StatusCode);
        Assert.Empty(ArquivosNoDisco());
    }

    [Fact]
    public async Task Casal_DeveLerEBaixarMasNaoEscrever()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);
        var parcela = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 1_000m, _hoje.AddDays(-2));
        await OrganizacaoA.Cliente.PutAsJsonAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"), new { pagaEm = (string?)null });
        await EnviarComprovanteAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, parcela.Id, PdfValido, "recibo.pdf");
        var outro = await CenarioAsync(OrganizacaoA.Cliente, nomeFornecedor: "Outro Buffet");
        var casal = await CriarClienteCasalAsync(casamentoId);

        var financeiro = await casal.GetFromJsonAsync<FinanceiroCasamentoDto>(RotaFinanceiro(casamentoId));
        var alertas = await casal.GetAsync($"{RotaFinanceiro(casamentoId)}/alertas");
        var download = await casal.GetAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "comprovante"));
        var criar = await casal.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(10m, _hoje));
        var desfazer = await casal.DeleteAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"));
        var consolidado = await casal.GetAsync("/api/financeiro/alertas");
        var outroCasamento = await casal.GetAsync(RotaFinanceiro(outro.CasamentoId));

        Assert.True(financeiro!.SomenteLeitura);
        Assert.Equal(1_000m, financeiro.Resumo.TotalPago);
        Assert.Equal(HttpStatusCode.OK, alertas.StatusCode);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, criar.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, desfazer.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, consolidado.StatusCode);
        await AssertNaoEncontradoAsync(outroCasamento);
    }

    [Fact]
    public async Task CasamentoArquivado_DeveRecusarEscritasEManterLeitura()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);
        var parcela = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 1_000m, _hoje.AddDays(-2));
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"/api/casamentos/{casamentoId}/arquivar", null)).StatusCode);

        var criar = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(10m, _hoje));
        var pagar = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"), new { pagaEm = (string?)null });
        var gerar = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId, acao: "geracao"), new { quantidade = 2, primeiroVencimento = "2027-01-10" });
        var financeiro = (await OrganizacaoA.Cliente.GetFromJsonAsync<FinanceiroCasamentoDto>(RotaFinanceiro(casamentoId)))!;
        var consolidado = (await OrganizacaoA.Cliente.GetFromJsonAsync<AlertasPagamentosDto>("/api/financeiro/alertas"))!;

        Assert.Equal(HttpStatusCode.UnprocessableEntity, criar.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, pagar.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, gerar.StatusCode);
        Assert.True(financeiro.SomenteLeitura);
        Assert.Equal(0, financeiro.Alertas.TotalVencidas);
        Assert.DoesNotContain(consolidado.Vencidas, item => item.CasamentoId == casamentoId);
    }

    [Fact]
    public async Task VinculoComParcelas_NaoPodeSerRemovidoNemVoltarParaNegociacaoNemReduzirContratado()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente, contratado: 10_000m);
        await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 4_000m, _hoje.AddDays(5));
        var rotaVinculo = $"/api/casamentos/{casamentoId}/fornecedores/{vinculoId}";

        var remover = await OrganizacaoA.Cliente.DeleteAsync(rotaVinculo);
        var negociacao = await OrganizacaoA.Cliente.PutAsJsonAsync(rotaVinculo, new { servico = "Jantar", valorOrcado = 10_000m, valorContratado = 10_000m, status = "EmNegociacao", notasInternas = (string?)null });
        var reduzir = await OrganizacaoA.Cliente.PutAsJsonAsync(rotaVinculo, new { servico = "Jantar", valorOrcado = 10_000m, valorContratado = 3_999.99m, status = "Contratado", notasInternas = (string?)null });
        var cancelar = await OrganizacaoA.Cliente.PutAsJsonAsync(rotaVinculo, new { servico = "Jantar", valorOrcado = 10_000m, valorContratado = 10_000m, status = "Cancelado", notasInternas = (string?)null });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, remover.StatusCode);
        Assert.Equal(MensagensFinanceiro.VinculoComParcelas, (await ProblemaAsync(remover)).Detail);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, negociacao.StatusCode);
        Assert.Equal("status", await CampoAsync(negociacao));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, reduzir.StatusCode);
        Assert.Equal("valorContratado", await CampoAsync(reduzir));
        Assert.Equal(HttpStatusCode.OK, cancelar.StatusCode);

        var financeiro = (await OrganizacaoA.Cliente.GetFromJsonAsync<FinanceiroCasamentoDto>(RotaFinanceiro(casamentoId)))!;
        Assert.Equal("Cancelado", Assert.Single(financeiro.Fornecedores).Status);
        Assert.Equal(0, financeiro.Alertas.TotalProximas);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.True(await contexto.FornecedoresCasamento.AnyAsync(vinculo => vinculo.Id == vinculoId));
    }

    [Fact]
    public async Task AlertasConsolidados_DevemContarCasamentosENumerarParcelas()
    {
        var primeiro = await CenarioAsync(OrganizacaoA.Cliente);
        var segundo = await CenarioAsync(OrganizacaoA.Cliente, nomeFornecedor: "Fotografia Lumière", categoria: "Fotografia");
        await CriarParcelaAsync(OrganizacaoA.Cliente, primeiro.CasamentoId, primeiro.VinculoId, 100m, _hoje.AddDays(-3));
        await CriarParcelaAsync(OrganizacaoA.Cliente, primeiro.CasamentoId, primeiro.VinculoId, 200m, _hoje.AddDays(2));
        await CriarParcelaAsync(OrganizacaoA.Cliente, segundo.CasamentoId, segundo.VinculoId, 300m, _hoje.AddDays(-1));
        await CriarParcelaAsync(OrganizacaoA.Cliente, segundo.CasamentoId, segundo.VinculoId, 400m, _hoje.AddDays(30));

        var alertas = (await OrganizacaoA.Cliente.GetFromJsonAsync<AlertasPagamentosDto>("/api/financeiro/alertas"))!;
        var doPrimeiro = (await OrganizacaoA.Cliente.GetFromJsonAsync<AlertasPagamentosDto>($"{RotaFinanceiro(primeiro.CasamentoId)}/alertas"))!;
        var deB = (await OrganizacaoB.Cliente.GetFromJsonAsync<AlertasPagamentosDto>("/api/financeiro/alertas"))!;

        Assert.Equal(2, alertas.TotalVencidas);
        Assert.Equal(400m, alertas.ValorVencidas);
        Assert.Equal(2, alertas.CasamentosComVencidas);
        Assert.Equal(1, alertas.TotalProximas);
        Assert.Equal(_hoje.AddDays(-3), alertas.Vencidas[0].Vencimento);
        Assert.Equal("Buffet São João", alertas.Vencidas[0].NomeEmpresa);
        Assert.Equal(1, alertas.Vencidas[0].Numero);
        Assert.Equal(2, alertas.Vencidas[0].TotalParcelas);
        Assert.Equal(-3, alertas.Vencidas[0].DiasParaVencimento);
        Assert.Equal(2, alertas.Proximas.Single().Numero);
        Assert.Equal(1, doPrimeiro.TotalVencidas);
        Assert.Equal(1, doPrimeiro.TotalProximas);
        Assert.Equal(0, deB.TotalVencidas + deB.TotalProximas);
    }

    [Fact]
    public async Task OrganizacaoB_NaoDeveLerNemAlterarParcelasDeA()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);
        var parcela = await CriarParcelaAsync(OrganizacaoA.Cliente, casamentoId, vinculoId, 1_000m, _hoje);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaFinanceiro(casamentoId)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaParcelas(casamentoId, vinculoId)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(10m, _hoje)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id), Parcela(1m, _hoje)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "pagamento"), new { pagaEm = (string?)null }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaParcelas(casamentoId, vinculoId, parcela.Id, "comprovante")));

        var (casamentoB, vinculoB) = await CenarioAsync(OrganizacaoB.Cliente);
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaParcelas(casamentoB, vinculoB, parcela.Id), Parcela(1m, _hoje)));

        await using var contexto = CriarContexto(OrganizacaoA);
        var intacta = await contexto.ParcelasFornecedor.SingleAsync(item => item.Id == parcela.Id);
        Assert.Equal(1_000m, intacta.Valor);
        Assert.Equal(StatusParcela.Pendente, intacta.Status);
    }

    [Fact]
    public async Task Anonimo_DeveReceber401()
    {
        var (casamentoId, vinculoId) = await CenarioAsync(OrganizacaoA.Cliente);

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaFinanceiro(casamentoId))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync("/api/financeiro/alertas")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsJsonAsync(RotaParcelas(casamentoId, vinculoId), Parcela(10m, _hoje))).StatusCode);
    }
}
