using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Financeiro;
using Celebri.Aplicacao.FornecedoresCasamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Financeiro;

public class ParcelaFornecedorTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2026, 9, 30);

    public static FornecedorCasamento Vinculo(StatusFornecedorCasamento status = StatusFornecedorCasamento.Contratado, decimal? contratado = 10_000m)
    {
        return FornecedorCasamento.Criar(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new DadosFornecedorCasamento("Jantar", 9_000m, contratado, status, null),
            null,
            Agora);
    }

    private static ParcelaFornecedor Parcela(decimal valor = 1_000m, DateOnly? vencimento = null)
    {
        return ParcelaFornecedor.Criar(Vinculo(), new DadosParcela(valor, vencimento ?? Hoje, "Pix"), null, Agora);
    }

    [Fact]
    public void Criar_EmVinculoContratado_DeveNascerPendenteHerdandoCasamentoEVinculo()
    {
        var vinculo = Vinculo();

        var parcela = ParcelaFornecedor.Criar(vinculo, new DadosParcela(1_500.50m, Hoje, "  Sinal  "), null, Agora);

        Assert.Equal(vinculo.CasamentoId, parcela.CasamentoId);
        Assert.Equal(vinculo.Id, parcela.FornecedorCasamentoId);
        Assert.Equal(StatusParcela.Pendente, parcela.Status);
        Assert.Equal("Sinal", parcela.Observacao);
        Assert.Equal(Guid.Empty, parcela.OrganizacaoId);
    }

    [Theory]
    [InlineData(StatusFornecedorCasamento.Cotacao)]
    [InlineData(StatusFornecedorCasamento.EmNegociacao)]
    public void Criar_EmVinculoNaoContratado_DeveRecusar(StatusFornecedorCasamento status)
    {
        var excecao = Assert.Throws<RegraNegocioException>(
            () => ParcelaFornecedor.Criar(Vinculo(status, null), new DadosParcela(10m, Hoje, null), null, Agora));

        Assert.Equal(MensagensFinanceiro.VinculoNaoContratado, excecao.Message);
    }

    [Fact]
    public void Criar_EmVinculoCancelado_DeveRecusarComoHistorico()
    {
        var excecao = Assert.Throws<RegraNegocioException>(
            () => ParcelaFornecedor.Criar(Vinculo(StatusFornecedorCasamento.Cancelado, 100m), new DadosParcela(10m, Hoje, null), null, Agora));

        Assert.Equal(MensagensFinanceiro.VinculoCancelado, excecao.Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("0.001")]
    [InlineData("100000000")]
    public void Criar_ComValorInvalido_DeveRecusarNoCampoValor(string valor)
    {
        var excecao = Assert.Throws<RegraNegocioException>(
            () => ParcelaFornecedor.Criar(Vinculo(), new DadosParcela(decimal.Parse(valor, System.Globalization.CultureInfo.InvariantCulture), Hoje, null), null, Agora));

        Assert.Equal(ParcelaFornecedor.CampoValor, excecao.Campo);
    }

    [Fact]
    public void Criar_ComVencimentoForaDaFaixaOuObservacaoLonga_DeveRecusar()
    {
        var vencimento = Assert.Throws<RegraNegocioException>(
            () => ParcelaFornecedor.Criar(Vinculo(), new DadosParcela(10m, new DateOnly(1999, 12, 31), null), null, Agora));
        var observacao = Assert.Throws<RegraNegocioException>(
            () => ParcelaFornecedor.Criar(Vinculo(), new DadosParcela(10m, Hoje, new string('a', 121)), null, Agora));

        Assert.Equal(ParcelaFornecedor.CampoVencimento, vencimento.Campo);
        Assert.Equal(ParcelaFornecedor.CampoObservacao, observacao.Campo);
    }

    [Fact]
    public void Situacao_NaViradaDoDia_DevePassarDePendenteParaVencidaSemEscrita()
    {
        var parcela = Parcela(vencimento: new DateOnly(2026, 9, 30));
        var atualizadoEm = parcela.AtualizadoEm;

        Assert.Equal(SituacaoParcela.Pendente, parcela.Situacao(new DateOnly(2026, 9, 30)));
        Assert.True(parcela.VenceEmBreve(new DateOnly(2026, 9, 30)));
        Assert.Equal(SituacaoParcela.Vencida, parcela.Situacao(new DateOnly(2026, 10, 1)));
        Assert.False(parcela.VenceEmBreve(new DateOnly(2026, 10, 1)));
        Assert.Equal(-1, parcela.DiasParaVencimento(new DateOnly(2026, 10, 1)));
        Assert.Equal(StatusParcela.Pendente, parcela.Status);
        Assert.Equal(atualizadoEm, parcela.AtualizadoEm);
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(7, true)]
    [InlineData(8, false)]
    public void VenceEmBreve_DeveRespeitarAJanelaDeSeteDias(int dias, bool esperado)
    {
        var parcela = Parcela(vencimento: Hoje.AddDays(dias));

        Assert.Equal(esperado, parcela.VenceEmBreve(Hoje));
    }

    [Fact]
    public void RegistrarPagamento_ComDataFuturaOuAnteriorA2000_DeveRecusarNoCampoPagaEm()
    {
        var parcela = Parcela();

        var futura = Assert.Throws<RegraNegocioException>(() => parcela.RegistrarPagamento(Hoje.AddDays(1), Hoje, Agora));
        var antiga = Assert.Throws<RegraNegocioException>(() => parcela.RegistrarPagamento(new DateOnly(1999, 1, 1), Hoje, Agora));

        Assert.Equal(ParcelaFornecedor.CampoPagaEm, futura.Campo);
        Assert.Equal(MensagensFinanceiro.PagamentoFuturo, futura.Message);
        Assert.Equal(ParcelaFornecedor.CampoPagaEm, antiga.Campo);
        Assert.False(parcela.Paga);
    }

    [Fact]
    public void RegistrarPagamento_DeveMarcarPagaEBloquearEdicao()
    {
        var parcela = Parcela(vencimento: Hoje.AddDays(-3));

        parcela.RegistrarPagamento(Hoje, Hoje, Agora);

        Assert.Equal(SituacaoParcela.Paga, parcela.Situacao(Hoje));
        Assert.Equal(Hoje, parcela.PagaEm);
        Assert.False(parcela.VenceEmBreve(Hoje));
        var excecao = Assert.Throws<RegraNegocioException>(() => parcela.Atualizar(new DadosParcela(5m, Hoje, null), Agora));
        Assert.Equal(MensagensFinanceiro.ParcelaPagaSemEdicao, excecao.Message);
    }

    [Fact]
    public void AnexarComprovante_SemPagamento_DeveRecusar()
    {
        var parcela = Parcela();

        var excecao = Assert.Throws<RegraNegocioException>(
            () => parcela.AnexarComprovante(Guid.NewGuid(), "pix.png", ArquivoComprovante.TipoPng, 10, Agora));

        Assert.Equal(MensagensFinanceiro.ComprovanteSemPagamento, excecao.Message);
    }

    [Fact]
    public void DesfazerPagamento_DeveVoltarAPendenteEDevolverOComprovanteParaApagar()
    {
        var parcela = Parcela();
        var arquivo = Guid.NewGuid();
        parcela.RegistrarPagamento(Hoje, Hoje, Agora);
        Assert.Null(parcela.AnexarComprovante(arquivo, "pix.png", ArquivoComprovante.TipoPng, 10, Agora));

        var descartado = parcela.DesfazerPagamento(Agora);

        Assert.Equal(arquivo, descartado);
        Assert.False(parcela.Paga);
        Assert.Null(parcela.PagaEm);
        Assert.False(parcela.PossuiComprovante);
        Assert.Null(parcela.ComprovanteTipoConteudo);
        Assert.Throws<RegraNegocioException>(() => parcela.DesfazerPagamento(Agora));
    }

    [Fact]
    public void AnexarComprovante_Substituindo_DeveDevolverOAnterior()
    {
        var parcela = Parcela();
        var primeiro = Guid.NewGuid();
        parcela.RegistrarPagamento(Hoje, Hoje, Agora);
        parcela.AnexarComprovante(primeiro, "a.pdf", ArquivoComprovante.TipoPdf, 10, Agora);

        var anterior = parcela.AnexarComprovante(Guid.NewGuid(), "b.pdf", ArquivoComprovante.TipoPdf, 20, Agora);

        Assert.Equal(primeiro, anterior);
        Assert.Equal(20, parcela.ComprovanteTamanhoBytes);
    }

    [Fact]
    public void GarantirCompativelComParcelas_DeveBloquearVoltarParaNegociacaoEReduzirAbaixoDaSoma()
    {
        var vinculo = Vinculo();

        var status = Assert.Throws<RegraNegocioException>(() => vinculo.GarantirCompativelComParcelas(
            new DadosFornecedorCasamento(null, null, 10_000m, StatusFornecedorCasamento.EmNegociacao, null), 2, 3_000m));
        var valor = Assert.Throws<RegraNegocioException>(() => vinculo.GarantirCompativelComParcelas(
            new DadosFornecedorCasamento(null, null, 2_999.99m, StatusFornecedorCasamento.Contratado, null), 2, 3_000m));

        Assert.Equal(FornecedorCasamento.CampoStatus, status.Campo);
        Assert.Equal(FornecedorCasamento.CampoValorContratado, valor.Campo);
        Assert.Contains("R$ 3.000,00", valor.Message);
        vinculo.GarantirCompativelComParcelas(
            new DadosFornecedorCasamento(null, null, 10_000m, StatusFornecedorCasamento.Cancelado, null), 2, 3_000m);
        vinculo.GarantirCompativelComParcelas(
            new DadosFornecedorCasamento(null, null, null, StatusFornecedorCasamento.Cotacao, null), 0, 0m);
    }
}

public class GeradorParcelasTestes
{
    private static readonly DateOnly Janeiro31 = new(2027, 1, 31);

    [Fact]
    public void Gerar_100Em3_DeveAjustarOsCentavosNaUltima()
    {
        var parcelas = GeradorParcelas.Gerar(100m, 3, Janeiro31);

        Assert.Equal([33.33m, 33.33m, 33.34m], parcelas.Select(parcela => parcela.Valor));
        Assert.Equal(100m, parcelas.Sum(parcela => parcela.Valor));
    }

    [Fact]
    public void Gerar_18500Em3_A_Partir_De31DeJaneiro_DeveUsarOUltimoDiaDoMesMaisCurto()
    {
        var parcelas = GeradorParcelas.Gerar(18_500m, 3, Janeiro31);

        Assert.Equal([6_166.66m, 6_166.66m, 6_166.68m], parcelas.Select(parcela => parcela.Valor));
        Assert.Equal([new DateOnly(2027, 1, 31), new DateOnly(2027, 2, 28), new DateOnly(2027, 3, 31)], parcelas.Select(parcela => parcela.Vencimento));
    }

    [Fact]
    public void Gerar_EmAnoBissexto_DeveUsar29DeFevereiro()
    {
        var parcelas = GeradorParcelas.Gerar(90m, 2, new DateOnly(2028, 1, 30));

        Assert.Equal(new DateOnly(2028, 2, 29), parcelas[1].Vencimento);
    }

    [Fact]
    public void Gerar_CincoCentavosEmDuas_DeveDar2e3Centavos()
    {
        var parcelas = GeradorParcelas.Gerar(0.05m, 2, Janeiro31);

        Assert.Equal([0.02m, 0.03m], parcelas.Select(parcela => parcela.Valor));
    }

    [Fact]
    public void Gerar_ValorMaximoEm60_DeveSomarExatamente()
    {
        var parcelas = GeradorParcelas.Gerar(99_999_999.99m, 60, Janeiro31);

        Assert.Equal(60, parcelas.Count);
        Assert.Equal(99_999_999.99m, parcelas.Sum(parcela => parcela.Valor));
        Assert.All(parcelas, parcela => Assert.Equal(decimal.Round(parcela.Valor, 2), parcela.Valor));
        Assert.Equal(new DateOnly(2031, 12, 31), parcelas[^1].Vencimento);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(61)]
    public void Gerar_ComQuantidadeForaDaFaixa_DeveRecusar(int quantidade)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => GeradorParcelas.Gerar(100m, quantidade, Janeiro31));

        Assert.Equal(ParcelaFornecedor.CampoQuantidade, excecao.Campo);
    }

    [Fact]
    public void Gerar_UmCentavoEmDuas_DeveRecusarPorValorPequeno()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => GeradorParcelas.Gerar(0.01m, 2, Janeiro31));

        Assert.Equal(MensagensFinanceiro.ValorPequenoParaDividir, excecao.Message);
    }

    [Fact]
    public void RegrasSoma_DeveCalcularSaldoEBloquearExcedenteComValorFormatado()
    {
        Assert.Equal(500m, RegrasSomaParcelas.SaldoAParcelar(10_000m, 9_500m));
        Assert.Equal(0m, RegrasSomaParcelas.SaldoAParcelar(10_000m, 10_000m));
        RegrasSomaParcelas.GarantirDentroDoContratado(10_000m, 10_000m, ParcelaFornecedor.CampoValor);

        var excecao = Assert.Throws<RegraNegocioException>(
            () => RegrasSomaParcelas.GarantirDentroDoContratado(10_000m, 10_500m, ParcelaFornecedor.CampoValor));

        Assert.Equal(ParcelaFornecedor.CampoValor, excecao.Campo);
        Assert.Equal(MensagensFinanceiro.SomaExcede("R$ 500,00"), excecao.Message);
    }
}

public class CalculadoraResumoPagamentosTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2026, 9, 30);

    private static VinculoFornecedor Item(CategoriaFornecedor categoria, decimal contratado, StatusFornecedorCasamento status = StatusFornecedorCasamento.Contratado)
    {
        var fornecedor = Fornecedor.Criar(new DadosFornecedor(categoria, $"Fornecedor {categoria}", null, "11987654321", null, null, null, null), Agora);
        var vinculo = FornecedorCasamento.Criar(Guid.NewGuid(), fornecedor.Id, new DadosFornecedorCasamento(null, contratado, contratado, status, null), null, Agora);
        return new VinculoFornecedor(vinculo, fornecedor);
    }

    private static ParcelaFornecedor Parcela(FornecedorCasamento vinculo, decimal valor, DateOnly vencimento, bool paga = false)
    {
        var parcela = ParcelaFornecedor.Criar(vinculo, new DadosParcela(valor, vencimento, null), null, Agora);
        if (paga)
        {
            parcela.RegistrarPagamento(Hoje.AddDays(-1), Hoje, Agora);
        }

        return parcela;
    }

    [Fact]
    public void Calcular_DeveSomarPagoPendenteEVencidoPorCategoriaENoTotal()
    {
        var buffet = Item(CategoriaFornecedor.Buffet, 18_500m);
        var musica = Item(CategoriaFornecedor.Musica, 4_200m);
        var parcelas = new List<ParcelaFornecedor>
        {
            Parcela(buffet.Vinculo, 6_000m, Hoje.AddDays(-60), paga: true),
            Parcela(buffet.Vinculo, 6_000m, Hoje.AddDays(-30), paga: true),
            Parcela(buffet.Vinculo, 3_250m, Hoje.AddDays(-1)),
            Parcela(buffet.Vinculo, 3_250m, Hoje.AddDays(20)),
            Parcela(musica.Vinculo, 2_500m, Hoje.AddDays(-10), paga: true),
            Parcela(musica.Vinculo, 1_700m, Hoje),
        };

        var resumo = CalculadoraResumoOrcamento.Calcular([buffet, musica], parcelas, Hoje);

        Assert.Equal(14_500m, resumo.TotalPago);
        Assert.Equal(8_200m, resumo.TotalPendente);
        Assert.Equal(3_250m, resumo.TotalVencido);
        Assert.Equal(22_700m, resumo.TotalParcelado);
        var categoriaBuffet = resumo.Categorias.Single(categoria => categoria.Categoria == "Buffet");
        Assert.Equal(12_000m, categoriaBuffet.Pago);
        Assert.Equal(6_500m, categoriaBuffet.Pendente);
        Assert.Equal(3_250m, categoriaBuffet.Vencido);
        var categoriaMusica = resumo.Categorias.Single(categoria => categoria.Categoria == "Musica");
        Assert.Equal(1_700m, categoriaMusica.Pendente);
        Assert.Equal(0m, categoriaMusica.Vencido);
    }

    [Fact]
    public void Calcular_DeveIgnorarParcelasDeVinculoCancelado()
    {
        var ativo = Item(CategoriaFornecedor.Buffet, 1_000m);
        var cancelado = Item(CategoriaFornecedor.Buffet, 1_000m);
        var parcelas = new List<ParcelaFornecedor>
        {
            Parcela(ativo.Vinculo, 400m, Hoje.AddDays(-1), paga: true),
            Parcela(cancelado.Vinculo, 300m, Hoje.AddDays(-5), paga: true),
            Parcela(cancelado.Vinculo, 200m, Hoje.AddDays(-5)),
        };
        cancelado.Vinculo.Atualizar(new DadosFornecedorCasamento(null, 1_000m, 1_000m, StatusFornecedorCasamento.Cancelado, null), Agora);

        var resumo = CalculadoraResumoOrcamento.Calcular([ativo, cancelado], parcelas, Hoje);

        Assert.Equal(400m, resumo.TotalPago);
        Assert.Equal(600m, resumo.TotalPendente);
        Assert.Equal(0m, resumo.TotalVencido);
    }

    [Fact]
    public void ResumoParcelas_DeveTrazerProximaPendenteESaldo()
    {
        var item = Item(CategoriaFornecedor.Buffet, 1_000m);
        var parcelas = new List<ParcelaFornecedor>
        {
            Parcela(item.Vinculo, 300m, Hoje.AddDays(-2), paga: true),
            Parcela(item.Vinculo, 300m, Hoje.AddDays(-1)),
            Parcela(item.Vinculo, 200m, Hoje.AddDays(9)),
        };

        var resumo = CalculadoraResumoOrcamento.ResumoParcelas(item.Vinculo, parcelas, Hoje)!;

        Assert.Equal(3, resumo.Quantidade);
        Assert.Equal(1, resumo.Pagas);
        Assert.Equal(1, resumo.Vencidas);
        Assert.Equal(200m, resumo.SaldoAParcelar);
        Assert.Equal(Hoje.AddDays(-1), resumo.ProximoVencimento);
        Assert.Null(CalculadoraResumoOrcamento.ResumoParcelas(item.Vinculo, [], Hoje));
    }

    [Fact]
    public void Numeracao_DeveSeguirAOrdemDosVencimentosPorVinculo()
    {
        var item = Item(CategoriaFornecedor.Buffet, 1_000m);
        var outro = Item(CategoriaFornecedor.Musica, 1_000m);
        var tardia = Parcela(item.Vinculo, 10m, Hoje.AddDays(30));
        var cedo = Parcela(item.Vinculo, 10m, Hoje);
        var avulsa = Parcela(outro.Vinculo, 10m, Hoje.AddDays(-30));

        var numeracao = NumeracaoParcelas.Numerar([tardia, cedo, avulsa]);

        Assert.Equal(new PosicaoParcela(1, 2), numeracao[cedo.Id]);
        Assert.Equal(new PosicaoParcela(2, 2), numeracao[tardia.Id]);
        Assert.Equal(new PosicaoParcela(1, 1), numeracao[avulsa.Id]);
    }

    [Fact]
    public void CalculadoraAlertas_DeveSepararVencidasDasProximas()
    {
        var item = Item(CategoriaFornecedor.Buffet, 10_000m);
        var parcelas = new List<ParcelaFornecedor>
        {
            Parcela(item.Vinculo, 100m, Hoje.AddDays(-1)),
            Parcela(item.Vinculo, 200m, Hoje),
            Parcela(item.Vinculo, 300m, Hoje.AddDays(7)),
            Parcela(item.Vinculo, 400m, Hoje.AddDays(8)),
            Parcela(item.Vinculo, 500m, Hoje.AddDays(-9), paga: true),
        };

        var totais = CalculadoraAlertasPagamentos.Calcular(parcelas, Hoje);

        Assert.Equal(new TotaisAlertasDto(1, 100m, 2, 500m), totais);
    }
}

public class ArquivoComprovanteTestes
{
    [Fact]
    public void DetectarFormato_DeveReconhecerPdfPngEJpegPelaAssinatura()
    {
        Assert.Equal(ArquivoComprovante.TipoPdf, ArquivoComprovante.DetectarFormato("%PDF-1.7"u8)!.TipoConteudo);
        Assert.Equal(ArquivoComprovante.TipoPng, ArquivoComprovante.DetectarFormato([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])!.TipoConteudo);
        Assert.Equal(ArquivoComprovante.TipoJpeg, ArquivoComprovante.DetectarFormato([0xFF, 0xD8, 0xFF, 0xE0])!.TipoConteudo);
    }

    [Theory]
    [InlineData("MZ")]
    [InlineData("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")]
    [InlineData("GIF89a")]
    [InlineData("")]
    public void DetectarFormato_ComOutroConteudo_DeveRetornarNulo(string conteudo)
    {
        Assert.Null(ArquivoComprovante.DetectarFormato(System.Text.Encoding.UTF8.GetBytes(conteudo)));
    }

    [Fact]
    public void SanitizarNome_DeveUsarAExtensaoDoConteudoReal()
    {
        var png = new FormatoComprovante(ArquivoComprovante.TipoPng, ".png");
        var jpeg = new FormatoComprovante(ArquivoComprovante.TipoJpeg, ".jpg");

        Assert.Equal("recibo.png", ArquivoComprovante.SanitizarNome("../../recibo.png", png));
        Assert.Equal("recibo.pdf.png", ArquivoComprovante.SanitizarNome("recibo.pdf", png));
        Assert.Equal("foto.jpg", ArquivoComprovante.SanitizarNome("foto.jpeg", jpeg));
        Assert.Equal("comprovante.png", ArquivoComprovante.SanitizarNome(null, png));
        Assert.Equal("a_b.png", ArquivoComprovante.SanitizarNome("a\"b.png", png));
    }

    [Fact]
    public async Task LerComLimite_AcimaDe10MB_DeveLancarComMensagemDoComprovante()
    {
        var conteudo = new MemoryStream(new byte[(10 * 1024 * 1024) + 1]);

        var excecao = await Assert.ThrowsAsync<Celebri.Aplicacao.Excecoes.ArquivoGrandeDemaisException>(
            () => ArquivoComprovante.LerComLimiteAsync(conteudo, CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.ComprovanteGrandeDemais, excecao.Message);
    }

    [Fact]
    public void ArquivoPdf_SanitizarNome_DeveManterOComportamentoDaTarefa16()
    {
        Assert.Equal("contrato.pdf", ArquivoPdf.SanitizarNome(null));
        Assert.Equal("Contrato Buffet.pdf", ArquivoPdf.SanitizarNome("C:\\docs\\Contrato   Buffet.PDF"));
    }
}
