using System.Text;
using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Financeiro;
using Celebri.Aplicacao.FornecedoresCasamento;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Celebri.Testes.Unidade.Fornecedores;

namespace Celebri.Testes.Unidade.Financeiro;

public class ParcelaFornecedorServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2026, 9, 30);

    private readonly RepositorioCasamentosFinanceiro _casamentos = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly RepositorioParcelasMemoria _parcelas;
    private readonly ArmazenamentoFinanceiroMemoria _armazenamento = new();
    private readonly UnidadeTrabalhoFinanceiro _unidade = new();
    private readonly CalendarioLocalFixo _calendario = new(Hoje);
    private readonly CasamentoAssessorado _casamento;
    private readonly FornecedorCasamento _buffet;

    public ParcelaFornecedorServiceTestes()
    {
        _parcelas = new RepositorioParcelasMemoria(_vinculos);
        _casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "João", new DateOnly(2026, 12, 12), null, null, null, null, null),
            Agora);
        _casamentos.Itens.Add(_casamento);
        _parcelas.Casamentos[_casamento.Id] = _casamento;
        _buffet = NovoVinculo("Buffet São João", CategoriaFornecedor.Buffet, 18_500m);
    }

    private FornecedorCasamento NovoVinculo(string nome, CategoriaFornecedor categoria, decimal? contratado, StatusFornecedorCasamento status = StatusFornecedorCasamento.Contratado)
    {
        var fornecedor = Fornecedor.Criar(new DadosFornecedor(categoria, nome, null, "11987654321", null, null, null, null), Agora);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        var vinculo = FornecedorCasamento.Criar(_casamento.Id, fornecedor.Id, new DadosFornecedorCasamento(null, contratado, contratado, status, "Comissão"), null, Agora);
        _vinculos.Itens.Add(vinculo);
        return vinculo;
    }

    private ParcelaFornecedorService Service(IUsuarioAtual? usuario = null)
    {
        return new ParcelaFornecedorService(
            _casamentos,
            _vinculos,
            _parcelas,
            _armazenamento,
            _unidade,
            new RelogioFixo(Agora),
            _calendario,
            usuario ?? UsuarioAtualFalso.Dono());
    }

    private static SalvarParcelaRequest Parcela(decimal valor, DateOnly? vencimento = null, string? observacao = null)
    {
        return new SalvarParcelaRequest(valor, vencimento ?? Hoje.AddDays(10), observacao);
    }

    private static MemoryStream Arquivo(string conteudo) => new(Encoding.UTF8.GetBytes(conteudo));

    [Fact]
    public async Task Criar_DeveGravarTocarOVinculoENumerar()
    {
        var dto = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(6_000m, observacao: "Sinal"), CancellationToken.None);

        Assert.Equal(1, dto.Numero);
        Assert.Equal(1, dto.TotalParcelas);
        Assert.Equal("Pendente", dto.Situacao);
        Assert.Equal(10, dto.DiasParaVencimento);
        Assert.Single(_parcelas.Itens);
        Assert.Equal(1, _vinculos.MarcacoesAlteracao);
        Assert.Equal(1, _unidade.Salvamentos);
    }

    [Fact]
    public async Task Criar_QuandoASomaPassaDoContratado_DeveRecusarNoCampoValorSemGravar()
    {
        await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(18_000m), CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(500.01m), CancellationToken.None));

        Assert.Equal(ParcelaFornecedor.CampoValor, excecao.Campo);
        Assert.Contains("R$ 0,01", excecao.Message);
        Assert.Single(_parcelas.Itens);
    }

    [Fact]
    public async Task Criar_EmVinculoEmNegociacao_DeveRecusar()
    {
        var negociacao = NovoVinculo("Florista", CategoriaFornecedor.Decoracao, null, StatusFornecedorCasamento.EmNegociacao);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().CriarAsync(_casamento.Id, negociacao.Id, Parcela(10m), CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.VinculoNaoContratado, excecao.Message);
    }

    [Fact]
    public async Task Criar_EmCasamentoArquivado_DeveRecusar()
    {
        _casamento.Arquivar(Agora);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(10m), CancellationToken.None));

        Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, excecao.Message);
    }

    [Fact]
    public async Task Criar_EmVinculoInexistente_DeveRetornarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(
            () => Service().CriarAsync(_casamento.Id, Guid.NewGuid(), Parcela(10m), CancellationToken.None));
    }

    [Fact]
    public async Task Gerar_SemValorTotal_DeveUsarOSaldoEAjustarCentavos()
    {
        await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(500m), CancellationToken.None);

        var cronograma = await Service().GerarAsync(
            _casamento.Id,
            _buffet.Id,
            new GerarParcelasRequest(3, null, new DateOnly(2027, 1, 31), null),
            CancellationToken.None);

        Assert.Equal(4, cronograma.Parcelas.Count);
        Assert.Equal(18_500m, cronograma.Parcelado);
        Assert.Equal(0m, cronograma.SaldoAParcelar);
        Assert.Equal([6_000m, 6_000m, 6_000m], cronograma.Parcelas.Skip(1).Select(parcela => parcela.Valor));
        Assert.Equal(new DateOnly(2027, 2, 28), cronograma.Parcelas[2].Vencimento);
        Assert.Equal(Enumerable.Range(1, 4), cronograma.Parcelas.Select(parcela => parcela.Numero));
    }

    [Fact]
    public async Task Gerar_AcimaDoSaldoOuDoLimite_DeveRecusar()
    {
        var soma = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().GerarAsync(
            _casamento.Id,
            _buffet.Id,
            new GerarParcelasRequest(2, 18_500.02m, Hoje, null),
            CancellationToken.None));
        await Service().GerarAsync(_casamento.Id, _buffet.Id, new GerarParcelasRequest(59, 5_900m, Hoje, null), CancellationToken.None);
        var limite = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().GerarAsync(
            _casamento.Id,
            _buffet.Id,
            new GerarParcelasRequest(2, 2m, Hoje, null),
            CancellationToken.None));

        Assert.Equal(ParcelaFornecedor.CampoValorTotal, soma.Campo);
        Assert.Equal(MensagensFinanceiro.LimiteParcelas, limite.Message);
        Assert.Equal(59, _parcelas.Itens.Count);
    }

    [Fact]
    public async Task Gerar_SemSaldo_DeveRecusar()
    {
        await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(18_500m), CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().GerarAsync(
            _casamento.Id,
            _buffet.Id,
            new GerarParcelasRequest(2, null, Hoje, null),
            CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.SemSaldoParaGerar, excecao.Message);
    }

    [Fact]
    public async Task Atualizar_DeveDesconsiderarAPropriaParcelaNaSoma()
    {
        var criada = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(18_500m), CancellationToken.None);

        var dto = await Service().AtualizarAsync(_casamento.Id, _buffet.Id, criada.Id, Parcela(18_000m, Hoje.AddDays(-2)), CancellationToken.None);

        Assert.Equal(18_000m, dto.Valor);
        Assert.Equal("Vencida", dto.Situacao);
    }

    [Fact]
    public async Task PagarEDesfazer_DeveApagarOComprovanteSomenteDepoisDoCommit()
    {
        var criada = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(1_000m), CancellationToken.None);
        var paga = await Service().RegistrarPagamentoAsync(_casamento.Id, _buffet.Id, criada.Id, new RegistrarPagamentoRequest(null), CancellationToken.None);
        var comComprovante = await Service().AnexarComprovanteAsync(_casamento.Id, _buffet.Id, criada.Id, "pix.png", new MemoryStream([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01]), CancellationToken.None);

        Assert.Equal("Paga", paga.Situacao);
        Assert.Equal(Hoje, paga.PagaEm);
        Assert.Equal(ArquivoComprovante.TipoPng, comComprovante.Comprovante!.TipoConteudo);
        Assert.Single(_armazenamento.Arquivos);

        var desfeita = await Service().DesfazerPagamentoAsync(_casamento.Id, _buffet.Id, criada.Id, CancellationToken.None);

        Assert.Equal("Pendente", desfeita.Situacao);
        Assert.Null(desfeita.Comprovante);
        Assert.Empty(_armazenamento.Arquivos);
        Assert.Single(_armazenamento.Removidos);
    }

    [Fact]
    public async Task AnexarComprovante_SemPagamentoOuComFormatoInvalido_NaoDeveGravarArquivo()
    {
        var criada = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(1_000m), CancellationToken.None);

        var semPagamento = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().AnexarComprovanteAsync(_casamento.Id, _buffet.Id, criada.Id, "a.pdf", Arquivo("%PDF-1.7"), CancellationToken.None));
        await Service().RegistrarPagamentoAsync(_casamento.Id, _buffet.Id, criada.Id, new RegistrarPagamentoRequest(Hoje.AddDays(-1)), CancellationToken.None);
        var formato = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().AnexarComprovanteAsync(_casamento.Id, _buffet.Id, criada.Id, "virus.pdf", Arquivo("MZ executavel"), CancellationToken.None));
        var vazio = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().AnexarComprovanteAsync(_casamento.Id, _buffet.Id, criada.Id, "vazio.pdf", new MemoryStream(), CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.ComprovanteSemPagamento, semPagamento.Message);
        Assert.Equal(MensagensFinanceiro.ComprovanteFormatoInvalido, formato.Message);
        Assert.Equal(MensagensFinanceiro.ComprovanteVazio, vazio.Message);
        Assert.Empty(_armazenamento.Arquivos);
    }

    [Fact]
    public async Task AnexarComprovante_QuandoOCommitFalha_DeveApagarOArquivoNovo()
    {
        var criada = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(1_000m), CancellationToken.None);
        await Service().RegistrarPagamentoAsync(_casamento.Id, _buffet.Id, criada.Id, new RegistrarPagamentoRequest(null), CancellationToken.None);
        _unidade.FalharProxima = true;

        await Assert.ThrowsAsync<ConcorrenciaException>(
            () => Service().AnexarComprovanteAsync(_casamento.Id, _buffet.Id, criada.Id, "a.pdf", Arquivo("%PDF-1.7 recibo"), CancellationToken.None));

        Assert.Empty(_armazenamento.Arquivos);
        Assert.Single(_armazenamento.Removidos);
    }

    [Fact]
    public async Task RemoverOuEditar_ParcelaPaga_DeveRecusar()
    {
        var criada = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(1_000m), CancellationToken.None);
        await Service().RegistrarPagamentoAsync(_casamento.Id, _buffet.Id, criada.Id, new RegistrarPagamentoRequest(null), CancellationToken.None);

        var remover = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().RemoverAsync(_casamento.Id, _buffet.Id, criada.Id, CancellationToken.None));
        var editar = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().AtualizarAsync(_casamento.Id, _buffet.Id, criada.Id, Parcela(10m), CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.ParcelaPagaSemEdicao, remover.Message);
        Assert.Equal(MensagensFinanceiro.ParcelaPagaSemEdicao, editar.Message);
        Assert.Single(_parcelas.Itens);
    }

    [Fact]
    public async Task Pagar_EmVinculoCancelado_DeveRecusarPorSerHistorico()
    {
        var criada = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(1_000m), CancellationToken.None);
        _buffet.Atualizar(new DadosFornecedorCasamento(null, 18_500m, 18_500m, StatusFornecedorCasamento.Cancelado, null), Agora);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().RegistrarPagamentoAsync(
            _casamento.Id, _buffet.Id, criada.Id, new RegistrarPagamentoRequest(null), CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.VinculoCancelado, excecao.Message);
    }

    [Fact]
    public async Task ObterFinanceiro_ParaOCasal_DeveSerSomenteLeituraComTotaisEAlertas()
    {
        var musica = NovoVinculo("Banda Aurora", CategoriaFornecedor.Musica, 4_200m);
        NovoVinculo("Florista", CategoriaFornecedor.Decoracao, 3_000m, StatusFornecedorCasamento.Cotacao);
        var vencida = await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(3_250m, Hoje.AddDays(-1)), CancellationToken.None);
        await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(3_250m, Hoje.AddDays(5)), CancellationToken.None);
        var paga = await Service().CriarAsync(_casamento.Id, musica.Id, Parcela(2_500m, Hoje.AddDays(-10)), CancellationToken.None);
        await Service().RegistrarPagamentoAsync(_casamento.Id, musica.Id, paga.Id, new RegistrarPagamentoRequest(null), CancellationToken.None);

        var financeiro = await Service(UsuarioAtualFalso.Casal(_casamento.Id)).ObterFinanceiroAsync(_casamento.Id, CancellationToken.None);

        Assert.True(financeiro.SomenteLeitura);
        Assert.Equal(Hoje, financeiro.Hoje);
        Assert.Equal(new TotaisAlertasDto(1, 3_250m, 1, 3_250m), financeiro.Alertas);
        Assert.Equal(2_500m, financeiro.Resumo.TotalPago);
        Assert.Equal(20_200m, financeiro.Resumo.TotalPendente);
        Assert.Equal(3_250m, financeiro.Resumo.TotalVencido);
        Assert.Equal(["Buffet São João", "Banda Aurora"], financeiro.Fornecedores.Select(fornecedor => fornecedor.NomeEmpresa));
        Assert.Equal("Vencida", financeiro.Fornecedores[0].Parcelas.Single(parcela => parcela.Id == vencida.Id).Situacao);
        Assert.Equal(12_000m, financeiro.Fornecedores[0].SaldoAParcelar);
    }

    [Fact]
    public async Task ObterFinanceiro_ComVinculoCanceladoComParcelas_DeveListarComoHistoricoForaDosTotais()
    {
        await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(1_000m, Hoje.AddDays(-3)), CancellationToken.None);
        _buffet.Atualizar(new DadosFornecedorCasamento(null, 18_500m, 18_500m, StatusFornecedorCasamento.Cancelado, null), Agora);

        var financeiro = await Service().ObterFinanceiroAsync(_casamento.Id, CancellationToken.None);

        var cancelado = Assert.Single(financeiro.Fornecedores);
        Assert.Equal("Cancelado", cancelado.Status);
        Assert.Equal(0m, cancelado.Vencido);
        Assert.Equal(0m, cancelado.SaldoAParcelar);
        Assert.Equal(new TotaisAlertasDto(0, 0m, 0, 0m), financeiro.Alertas);
    }

    [Fact]
    public async Task Alertas_DevemNumerarAsParcelasEIgnorarCasamentoArquivado()
    {
        await Service().GerarAsync(_casamento.Id, _buffet.Id, new GerarParcelasRequest(3, 900m, Hoje.AddMonths(-1), null), CancellationToken.None);

        var alertas = await Service().ObterAlertasOrganizacaoAsync(CancellationToken.None);

        Assert.Equal(1, alertas.TotalVencidas);
        Assert.Equal(1, alertas.CasamentosComVencidas);
        var item = Assert.Single(alertas.Vencidas);
        Assert.Equal(1, item.Numero);
        Assert.Equal(3, item.TotalParcelas);
        Assert.Equal("Ana", item.NomePrimeiraPessoa);
        Assert.Equal("Buffet São João", item.NomeEmpresa);
        Assert.Equal(1, alertas.TotalProximas);
        Assert.Equal(2, alertas.Proximas.Single().Numero);

        _casamento.Arquivar(Agora);
        var depois = await Service().ObterAlertasOrganizacaoAsync(CancellationToken.None);
        Assert.Equal(0, depois.TotalVencidas + depois.TotalProximas);
    }

    [Fact]
    public async Task VirarODia_DeveMudarAParcelaParaVencidaSemEscrita()
    {
        await Service().CriarAsync(_casamento.Id, _buffet.Id, Parcela(100m, Hoje), CancellationToken.None);
        var salvamentos = _unidade.Salvamentos;

        var antes = await Service().ObterFinanceiroAsync(_casamento.Id, CancellationToken.None);
        _calendario.Data = Hoje.AddDays(1);
        var depois = await Service().ObterFinanceiroAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal("Pendente", antes.Fornecedores[0].Parcelas[0].Situacao);
        Assert.Equal("Vencida", depois.Fornecedores[0].Parcelas[0].Situacao);
        Assert.Equal(salvamentos, _unidade.Salvamentos);
    }
}

public class GanchosVinculoComParcelasTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2026, 9, 30);

    private readonly RepositorioCasamentosFinanceiro _casamentos = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly RepositorioParcelasMemoria _parcelas;
    private readonly CasamentoAssessorado _casamento;
    private readonly FornecedorCasamento _vinculo;

    public GanchosVinculoComParcelasTestes()
    {
        _parcelas = new RepositorioParcelasMemoria(_vinculos);
        _casamento = CasamentoAssessorado.Criar(new DadosCasamento("Ana", "João", new DateOnly(2026, 12, 12), null, null, null, null, null), Agora);
        _casamentos.Itens.Add(_casamento);
        var fornecedor = Fornecedor.Criar(new DadosFornecedor(CategoriaFornecedor.Buffet, "Buffet", null, "11987654321", null, null, null, null), Agora);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        _vinculo = FornecedorCasamento.Criar(_casamento.Id, fornecedor.Id, new DadosFornecedorCasamento(null, 10_000m, 10_000m, StatusFornecedorCasamento.Contratado, null), null, Agora);
        _vinculos.Itens.Add(_vinculo);
        _parcelas.Itens.Add(ParcelaFornecedor.Criar(_vinculo, new DadosParcela(4_000m, Hoje, null), null, Agora));
    }

    private FornecedorCasamentoService Service()
    {
        return new FornecedorCasamentoService(
            _casamentos,
            new RepositorioFornecedoresVazio(),
            _vinculos,
            _parcelas,
            new ArmazenamentoFinanceiroMemoria(),
            new UnidadeTrabalhoFinanceiro(),
            new RelogioFixo(Agora),
            new CalendarioLocalFixo(Hoje),
            UsuarioAtualFalso.Dono());
    }

    [Fact]
    public async Task Remover_VinculoComParcelas_DeveRecusarSemApagar()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(
            () => Service().RemoverAsync(_casamento.Id, _vinculo.Id, CancellationToken.None));

        Assert.Equal(MensagensFinanceiro.VinculoComParcelas, excecao.Message);
        Assert.Single(_vinculos.Itens);
    }

    [Fact]
    public async Task Atualizar_ParaEmNegociacaoOuAbaixoDaSoma_DeveRecusar()
    {
        var status = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().AtualizarAsync(
            _casamento.Id, _vinculo.Id, new AtualizarFornecedorCasamentoRequest(null, 10_000m, null, StatusFornecedorCasamento.EmNegociacao, null), CancellationToken.None));
        var valor = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().AtualizarAsync(
            _casamento.Id, _vinculo.Id, new AtualizarFornecedorCasamentoRequest(null, 10_000m, 3_999.99m, StatusFornecedorCasamento.Contratado, null), CancellationToken.None));

        Assert.Equal(FornecedorCasamento.CampoStatus, status.Campo);
        Assert.Equal(FornecedorCasamento.CampoValorContratado, valor.Campo);
        Assert.Equal(10_000m, _vinculo.ValorContratado);
    }

    [Fact]
    public async Task ListarEObter_DevemTrazerResumoDeParcelasEPagamentos()
    {
        var lista = await Service().ListarAsync(_casamento.Id, CancellationToken.None);
        var detalhe = await Service().ObterAsync(_casamento.Id, _vinculo.Id, CancellationToken.None);

        Assert.Equal(1, lista.Vinculos.Single().Parcelas!.Quantidade);
        Assert.Equal(6_000m, lista.Vinculos.Single().Parcelas!.SaldoAParcelar);
        Assert.Equal(0m, lista.Resumo.TotalPago);
        Assert.Equal(10_000m, lista.Resumo.TotalPendente);
        Assert.Equal(Hoje, detalhe.Parcelas!.ProximoVencimento);
    }

    private sealed class RepositorioFornecedoresVazio : Celebri.Aplicacao.Persistencia.IFornecedorRepository
    {
        public Task<IReadOnlyList<Fornecedor>> ListarAsync(CancellationToken cancelamento) => Task.FromResult<IReadOnlyList<Fornecedor>>([]);

        public Task<Fornecedor?> ObterAsync(Guid fornecedorId, CancellationToken cancelamento) => Task.FromResult<Fornecedor?>(null);

        public Task<int> ContarAsync(CancellationToken cancelamento) => Task.FromResult(0);

        public Task<Fornecedor?> BuscarPorChaveAsync(CategoriaFornecedor categoria, string nomeNormalizado, Guid? ignorarFornecedorId, CancellationToken cancelamento) =>
            Task.FromResult<Fornecedor?>(null);

        public void Adicionar(Fornecedor fornecedor)
        {
        }

        public void Remover(Fornecedor fornecedor)
        {
        }
    }
}
