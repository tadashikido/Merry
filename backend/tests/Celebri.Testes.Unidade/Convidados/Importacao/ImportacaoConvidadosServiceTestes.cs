using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Convidados.Importacao;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Testes.Unidade.Autenticacao.Fakes;
using static Casamento.Testes.Unidade.Convidados.Importacao.PlanilhasTeste;

namespace Casamento.Testes.Unidade.Convidados.Importacao;

public class ImportacaoConvidadosServiceTestes
{
    private const string PlanilhaValida = "Convite;Nome;Telefone;Idade\nFamília Lima;Ana Lima;(11) 98765-4321;Adulto\nFamília Lima;Bia Lima;;Criança\n;Carlos Dias;(21) 99876-5432;\n";
    private const string PlanilhaComErro = "Convite;Nome;Telefone\nFamília Lima;Ana Lima;(11) 98765-4321\nFamília Lima;Bia Lima;123\n;Carlos Dias;(21) 99876-5432\n";

    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioCasamentos _casamentos = new();
    private readonly RepositorioConvites _convites = new();
    private readonly UnidadeTrabalho _unidadeTrabalho = new();
    private readonly ImportacaoConvidadosService _service;
    private readonly CasamentoAssessorado _casamento;

    public ImportacaoConvidadosServiceTestes()
    {
        _service = new ImportacaoConvidadosService(_casamentos, _convites, _unidadeTrabalho, new RelogioFixo(Agora));
        _casamento = NovoCasamento();
    }

    private CasamentoAssessorado NovoCasamento(bool arquivado = false)
    {
        var casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "Bruno", new DateOnly(2027, 5, 15), null, null, null, 150, null),
            Agora);
        if (arquivado)
        {
            casamento.Arquivar(Agora);
        }
        _casamentos.Itens.Add(casamento);
        return casamento;
    }

    private static MemoryStream Fluxo(string conteudo)
    {
        return new MemoryStream(Utf8(conteudo));
    }

    [Fact]
    public async Task PreVisualizar_NaoDeveGravarEDeveResumirSemContatoNaListaDeConvites()
    {
        var previa = await _service.PreVisualizarAsync(_casamento.Id, Fluxo(PlanilhaValida), CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        Assert.Empty(_convites.Itens);
        Assert.Equal(new ResumoImportacaoDto(3, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, Convite.ConvidadosMaximoPorCasamento), previa.Resumo);
        Assert.Equal(["Convite", "Nome", "Telefone", "FaixaEtaria"], previa.ColunasReconhecidas);
        Assert.Equal("Família Lima", previa.Convites[0].Nome);
        Assert.Equal("Crianca", previa.Convites[0].Pessoas[1].FaixaEtaria);
        Assert.Empty(previa.LinhasComProblema);
    }

    [Fact]
    public async Task PreVisualizar_ComErro_DeveDevolverValoresOriginaisSoDasLinhasComProblema()
    {
        var previa = await _service.PreVisualizarAsync(_casamento.Id, Fluxo(PlanilhaComErro), CancellationToken.None);

        var linha = Assert.Single(previa.LinhasComProblema);
        Assert.Equal(3, linha.Linha);
        Assert.Equal("123", linha.Valores.Telefone);
        Assert.Equal("Família Lima", linha.Valores.Convite);
        var problema = Assert.Single(linha.Problemas);
        Assert.Equal("Erro", problema.Tipo);
        Assert.Equal("Telefone", problema.Coluna);
        Assert.Equal(1, previa.Resumo.ConvitesValidos);
        Assert.Equal(1, previa.Resumo.PessoasValidas);
        Assert.Equal(1, previa.Resumo.LinhasComErro);
        Assert.False(previa.Convites[0].Valido);
    }

    [Fact]
    public async Task PreVisualizar_DeveInformarConvidadosExistentesEApontarJaCadastrados()
    {
        _convites.Itens.Add(Convite.Criar(
            _casamento.Id,
            new DadosConvite(null, null, 0, [new DadosConvidado(null, "Carlos Dias", "21998765432", null, FaixaEtaria.Adulto, RespostaRsvp.Pendente)]),
            Agora));

        var previa = await _service.PreVisualizarAsync(_casamento.Id, Fluxo(PlanilhaValida), CancellationToken.None);

        Assert.Equal(1, previa.Resumo.ConvidadosExistentes);
        Assert.Equal(1, previa.Resumo.LinhasDuplicadas);
        Assert.Equal("Duplicado", previa.LinhasComProblema.Single().Problemas.Single().Tipo);
    }

    [Fact]
    public async Task PreVisualizar_CasamentoInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.PreVisualizarAsync(Guid.NewGuid(), Fluxo(PlanilhaValida), CancellationToken.None));
    }

    [Fact]
    public async Task PreVisualizarEImportar_CasamentoArquivado_DevemLancar422()
    {
        var arquivado = NovoCasamento(arquivado: true);

        var previa = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.PreVisualizarAsync(arquivado.Id, Fluxo(PlanilhaValida), CancellationToken.None));
        var importacao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(arquivado.Id, Fluxo(PlanilhaValida), new ConfirmarImportacaoRequest(false, 2, 3), CancellationToken.None));

        Assert.Equal(MensagensConvidados.CasamentoArquivado, previa.Message);
        Assert.Equal(MensagensConvidados.CasamentoArquivado, importacao.Message);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Importar_SemProblemas_DeveCriarTodosOsConvitesNumUnicoSalvamento()
    {
        var resultado = await _service.ImportarAsync(_casamento.Id, Fluxo(PlanilhaValida), new ConfirmarImportacaoRequest(false, 2, 3), CancellationToken.None);

        Assert.Equal(new ResultadoImportacaoDto(2, 3), resultado);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(1, _convites.ChamadasAdicionarVarios);
        Assert.Equal(2, _convites.Itens.Count);
        var familia = _convites.Itens[0];
        Assert.Equal(_casamento.Id, familia.CasamentoId);
        Assert.Equal(StatusEnvioConvite.NaoEnviado, familia.StatusEnvio);
        Assert.Equal(["Ana Lima", "Bia Lima"], familia.ConvidadosOrdenados().Select(pessoa => pessoa.Nome));
        Assert.Equal("Carlos Dias", _convites.Itens[1].Nome);
    }

    [Fact]
    public async Task Importar_ComProblemasSemSomenteValidos_DeveLancar422ENaoGravar()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_casamento.Id, Fluxo(PlanilhaComErro), new ConfirmarImportacaoRequest(false, 1, 1), CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.ImportacaoComProblemas, excecao.Message);
        Assert.Empty(_convites.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Importar_SomenteValidos_DeveDeixarDeForaOConviteInteiroComProblema()
    {
        var resultado = await _service.ImportarAsync(_casamento.Id, Fluxo(PlanilhaComErro), new ConfirmarImportacaoRequest(true, 1, 1), CancellationToken.None);

        Assert.Equal(new ResultadoImportacaoDto(1, 1), resultado);
        var convite = Assert.Single(_convites.Itens);
        Assert.Equal("Carlos Dias", convite.Nome);
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 3)]
    [InlineData(0, 0)]
    public async Task Importar_ConferenciaDivergente_DeveLancar422ENaoGravar(int convites, int pessoas)
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_casamento.Id, Fluxo(PlanilhaComErro), new ConfirmarImportacaoRequest(true, convites, pessoas), CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.PlanilhaAlterada, excecao.Message);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Importar_NenhumConviteValido_DeveLancar422()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_casamento.Id, Fluxo("Nome;Telefone\nAna;123\n"), new ConfirmarImportacaoRequest(true, 0, 0), CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.NenhumConviteValido, excecao.Message);
    }

    [Fact]
    public async Task Importar_AcimaDoLimiteDoCasamento_DeveLancar422ENaoGravar()
    {
        _convites.ContagemForcada = Convite.ConvidadosMaximoPorCasamento - 2;

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_casamento.Id, Fluxo(PlanilhaValida), new ConfirmarImportacaoRequest(false, 2, 3), CancellationToken.None));

        Assert.Equal(MensagensConvidados.LimitePorCasamento, excecao.Message);
        Assert.Empty(_convites.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task LerConteudo_AcimaDe2MB_DeveLancar422()
    {
        var grande = new MemoryStream(new byte[LimitesImportacao.TamanhoMaximoBytes + 1]);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => ImportacaoConvidadosService.LerConteudoAsync(grande, CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.ArquivoGrandeDemais, excecao.Message);
    }

    [Fact]
    public async Task LerConteudo_Exatamente2MB_DeveAceitar()
    {
        var limite = new MemoryStream(new byte[LimitesImportacao.TamanhoMaximoBytes]);

        var bytes = await ImportacaoConvidadosService.LerConteudoAsync(limite, CancellationToken.None);

        Assert.Equal(LimitesImportacao.TamanhoMaximoBytes, bytes.Length);
    }

    [Fact]
    public async Task Parametros_Nulos_DevemLancarArgumentNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.PreVisualizarAsync(_casamento.Id, null!, CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.ImportarAsync(_casamento.Id, Fluxo(PlanilhaValida), null!, CancellationToken.None));
    }

    private sealed class RepositorioCasamentos : ICasamentoRepository
    {
        public List<CasamentoAssessorado> Itens { get; } = [];

        public Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento)
        {
            IReadOnlyList<CasamentoAssessorado> resultado = Itens.Where(casamento => casamento.Arquivado == arquivados).ToList();
            return Task.FromResult(resultado);
        }

        public Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(casamento => casamento.Id == id));
        }

        public void Adicionar(CasamentoAssessorado casamento)
        {
            Itens.Add(casamento);
        }
    }

    private sealed class RepositorioConvites : IConviteRepository
    {
        public List<Convite> Itens { get; } = [];

        public int? ContagemForcada { get; set; }

        public int ChamadasAdicionarVarios { get; private set; }

        public Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return ListarPorCasamentoAsync(casamentoId, cancelamento);
        }

        public Task<IReadOnlyList<Convite>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<Convite> resultado = Itens.Where(convite => convite.CasamentoId == casamentoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<Convite?> ObterPorIdAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(convite => convite.Id == conviteId && convite.CasamentoId == casamentoId));
        }

        public Task<int> ContarConvidadosAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ContagemForcada ?? Itens.Where(convite => convite.CasamentoId == casamentoId).Sum(convite => convite.Convidados.Count));
        }

        public Task<ResumoConvidados> ObterResumoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(new ResumoConvidados([], 0, 0));
        }

        public Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ResumoEnvioConvites.Vazio);
        }

        public Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<IdentificacaoConvidado> resultado = Itens
                .Where(convite => convite.CasamentoId == casamentoId)
                .SelectMany(convite => convite.Convidados)
                .Select(convidado => new IdentificacaoConvidado(convidado.Nome, convidado.Telefone))
                .ToList();
            return Task.FromResult(resultado);
        }

        public void Adicionar(Convite convite)
        {
            Itens.Add(convite);
        }

        public void AdicionarVarios(IEnumerable<Convite> convites)
        {
            ChamadasAdicionarVarios++;
            Itens.AddRange(convites);
        }

        public void Remover(Convite convite)
        {
            Itens.Remove(convite);
        }
    }

    private sealed class UnidadeTrabalho : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            Salvamentos++;
            return Task.CompletedTask;
        }
    }
}
