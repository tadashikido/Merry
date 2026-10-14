using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Cronogramas;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Fornecedores;
using Casamento.Testes.Unidade.Autenticacao.Fakes;
using Casamento.Testes.Unidade.Fornecedores;

namespace Casamento.Testes.Unidade.Cronogramas;

public class CronogramaServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioCasamentosMemoria _casamentos = new();
    private readonly RepositorioItensMemoria _itens = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly CasamentoAssessorado _casamento;

    public CronogramaServiceTestes()
    {
        _casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "João", new DateOnly(2027, 5, 15), new TimeOnly(16, 30), "Capela", "Salão", null, null),
            Agora);
        _casamentos.Itens.Add(_casamento);
    }

    private CronogramaService Service(IUsuarioAtual? usuario = null)
    {
        return new CronogramaService(_casamentos, _itens, _vinculos, _unidadeTrabalho, new RelogioFixo(Agora), usuario ?? UsuarioAtualFalso.Dono());
    }

    private static SalvarItemCronogramaRequest Request(
        string? inicio = "16:30",
        int? duracao = 45,
        string? atividade = "Cerimônia",
        string? responsavel = "Fernanda",
        Guid? fornecedor = null,
        DiaCronograma? dia = null)
    {
        return new SalvarItemCronogramaRequest(dia, inicio, duracao, atividade, "Capela", responsavel, fornecedor, "Instruções", "Notas internas");
    }

    private ItemCronograma Adicionar(int hora, int minuto, int? duracao, string? responsavel, Guid? casamentoId = null, string atividade = "Item")
    {
        var item = ItemCronograma.Criar(
            casamentoId ?? _casamento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoCasamento, new TimeOnly(hora, minuto), duracao, atividade, null, responsavel, null, null, "nota"),
            null,
            Agora);
        _itens.Itens.Add(item);
        return item;
    }

    private Guid AdicionarVinculo(StatusFornecedorCasamento status = StatusFornecedorCasamento.Cotacao, Guid? casamentoId = null, string nome = "Coral Harmonia")
    {
        var fornecedor = Fornecedor.Criar(
            new DadosFornecedor(CategoriaFornecedor.Musica, nome, null, null, null, null, null, null),
            Agora);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        var vinculo = FornecedorCasamento.Criar(
            casamentoId ?? _casamento.Id,
            fornecedor.Id,
            new DadosFornecedorCasamento("Música", 1_000m, status == StatusFornecedorCasamento.Contratado ? 1_000m : null, status, null),
            null,
            Agora);
        _vinculos.Itens.Add(vinculo);
        return vinculo.Id;
    }

    [Fact]
    public async Task Listar_DeveOrdenarCalcularConflitosEInformarDadosDoCasamento()
    {
        var vinculo = AdicionarVinculo();
        AdicionarVinculo(StatusFornecedorCasamento.Cancelado, nome: "Cancelado");
        var retoque = Adicionar(17, 0, 20, "fernanda", atividade: "Retoque");
        var cerimonia = Adicionar(16, 30, 45, "Fernanda", atividade: "Cerimônia");
        Adicionar(13, 0, 60, "Ana", atividade: "Making of");
        Adicionar(10, 0, 60, "Ana", Guid.NewGuid());

        var dto = await Service().ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal(["Making of", "Cerimônia", "Retoque"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal(2, dto.ItensComConflito);
        Assert.Equal("16:30", dto.HorarioCerimonia);
        Assert.Equal("Capela", dto.LocalCerimonia);
        Assert.False(dto.SomenteLeitura);
        Assert.Equal(vinculo, Assert.Single(dto.FornecedoresDisponiveis).FornecedorCasamentoId);
        var conflito = Assert.Single(dto.Itens[1].Conflitos);
        Assert.Equal(retoque.Id, conflito.ItemId);
        Assert.Equal("Retoque", conflito.Atividade);
        Assert.Equal("17:00", conflito.Inicio);
        Assert.Equal("DiaDoCasamento", conflito.Dia);
        Assert.Equal("Responsavel", conflito.Motivo);
        Assert.Equal(cerimonia.Id, dto.Itens[1].Id);
        Assert.Equal(0, dto.Itens[1].MinutosDesdeCerimonia);
        Assert.Equal("nota", dto.Itens[1].NotasInternas);
    }

    [Fact]
    public async Task Listar_Casal_DeveOcultarNotasEFornecedoresDisponiveisEFicarSomenteLeitura()
    {
        AdicionarVinculo();
        Adicionar(16, 30, 45, "Fernanda");

        var dto = await Service(UsuarioAtualFalso.Casal(_casamento.Id)).ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.True(dto.SomenteLeitura);
        Assert.Null(Assert.Single(dto.Itens).NotasInternas);
        Assert.Empty(dto.FornecedoresDisponiveis);
    }

    [Fact]
    public async Task Listar_CasamentoArquivado_DeveFicarSomenteLeitura()
    {
        _casamento.Arquivar(Agora);

        var dto = await Service().ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.True(dto.Arquivado);
        Assert.True(dto.SomenteLeitura);
    }

    [Fact]
    public async Task Listar_CasamentoInexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ListarAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Obter_ItemDeOutroCasamento_DeveLancarNaoEncontrado()
    {
        var deOutro = Adicionar(10, 0, null, null, Guid.NewGuid());

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ObterAsync(_casamento.Id, deOutro.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Criar_DeveSalvarComUsuarioEFornecedor()
    {
        var vinculo = AdicionarVinculo();
        var dono = UsuarioAtualFalso.Dono();

        var dto = await Service(dono).CriarAsync(_casamento.Id, Request(fornecedor: vinculo), CancellationToken.None);

        var item = Assert.Single(_itens.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(item.Id, dto.Id);
        Assert.Equal(dono.UsuarioId, item.CriadoPorUsuarioId);
        Assert.Equal("DiaDoCasamento", dto.Dia);
        Assert.Equal(new DateOnly(2027, 5, 15), dto.Data);
        Assert.Equal("17:15", dto.Termino);
        Assert.Equal("Coral Harmonia", dto.Fornecedor!.NomeEmpresa);
        Assert.Equal("Musica", dto.Fornecedor.Categoria);
    }

    [Fact]
    public async Task Criar_CasamentoArquivado_DeveLancarRegra()
    {
        _casamento.Arquivar(Agora);

        var erro = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().CriarAsync(_casamento.Id, Request(), CancellationToken.None));

        Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, erro.Message);
        Assert.Empty(_itens.Itens);
    }

    [Fact]
    public async Task Criar_NoLimite_DeveLancarRegra()
    {
        for (var indice = 0; indice < ItemCronograma.LimitePorCasamento; indice++)
        {
            Adicionar(indice % 24, indice % 60, null, null);
        }

        var erro = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().CriarAsync(_casamento.Id, Request(), CancellationToken.None));

        Assert.Equal(MensagensCronograma.LimitePorCasamento, erro.Message);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Criar_FornecedorDeOutroCasamentoOuInexistente_DeveLancarComCampo()
    {
        var deOutro = AdicionarVinculo(casamentoId: Guid.NewGuid());

        var erroOutro = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().CriarAsync(_casamento.Id, Request(fornecedor: deOutro), CancellationToken.None));
        var erroInexistente = await Assert.ThrowsAsync<RegraNegocioException>(() => Service().CriarAsync(_casamento.Id, Request(fornecedor: Guid.NewGuid()), CancellationToken.None));

        Assert.Equal(ItemCronograma.CampoFornecedor, erroOutro.Campo);
        Assert.Equal(ItemCronograma.CampoFornecedor, erroInexistente.Campo);
        Assert.Empty(_itens.Itens);
    }

    [Fact]
    public async Task Criar_FornecedorCancelado_DeveLancar()
    {
        var cancelado = AdicionarVinculo(StatusFornecedorCasamento.Cancelado);

        await Assert.ThrowsAsync<RegraNegocioException>(() => Service().CriarAsync(_casamento.Id, Request(fornecedor: cancelado), CancellationToken.None));
    }

    [Fact]
    public async Task Atualizar_MantendoFornecedorQueFoiCanceladoDepois_DevePermitir()
    {
        var vinculo = AdicionarVinculo();
        var criado = await Service().CriarAsync(_casamento.Id, Request(fornecedor: vinculo), CancellationToken.None);
        var registro = _vinculos.Itens.Single(item => item.Id == vinculo);
        registro.Atualizar(new DadosFornecedorCasamento("Música", 1_000m, null, StatusFornecedorCasamento.Cancelado, null), Agora);

        var dto = await Service().AtualizarAsync(_casamento.Id, criado.Id, Request(atividade: "Cortejo", fornecedor: vinculo), CancellationToken.None);

        Assert.Equal("Cortejo", dto.Atividade);
        Assert.Equal(vinculo, dto.Fornecedor!.FornecedorCasamentoId);
    }

    [Fact]
    public async Task Atualizar_DeveAplicarDadosESalvar()
    {
        var item = Adicionar(10, 0, null, "Ana");

        var dto = await Service().AtualizarAsync(_casamento.Id, item.Id, Request(inicio: "21:30", duracao: 270, dia: DiaCronograma.DiaDoCasamento), CancellationToken.None);

        Assert.Equal("21:30", dto.Inicio);
        Assert.Equal("02:00", dto.Termino);
        Assert.True(dto.TerminaEmOutroDia);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Remover_DeveApagarESalvar()
    {
        var item = Adicionar(10, 0, null, "Ana");

        await Service().RemoverAsync(_casamento.Id, item.Id, CancellationToken.None);

        Assert.Empty(_itens.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Remover_ItemInexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().RemoverAsync(_casamento.Id, Guid.NewGuid(), CancellationToken.None));
    }

    [Theory]
    [InlineData("A")]
    [InlineData("  B  ")]
    public void Request_AtividadeCurtaAposNormalizar_DeveApontarOCampo(string atividade)
    {
        var request = Request(atividade: atividade);

        var erro = Assert.Single(request.Validate(new ValidationContext(request)));

        Assert.Equal(MensagensCronograma.TamanhoAtividade, erro.ErrorMessage);
        Assert.Contains(nameof(SalvarItemCronogramaRequest.Atividade), erro.MemberNames);
    }

    [Fact]
    public void Request_DiaInvalido_DeveApontarOCampo()
    {
        var request = Request(dia: (DiaCronograma)7);

        Assert.Contains(nameof(SalvarItemCronogramaRequest.Dia), Assert.Single(request.Validate(new ValidationContext(request))).MemberNames);
    }

    [Fact]
    public void Request_SemDia_DeveUsarDiaDoCasamento()
    {
        var dados = Request().ParaDados();

        Assert.Equal(DiaCronograma.DiaDoCasamento, dados.Dia);
        Assert.Equal(new TimeOnly(16, 30), dados.Inicio);
    }

    [Fact]
    public void Request_InicioInvalidoNoParaDados_DeveLancarComCampo()
    {
        Assert.Equal(ItemCronograma.CampoInicio, Assert.Throws<RegraNegocioException>(() => Request(inicio: "16h").ParaDados()).Campo);
        Assert.Equal(ItemCronograma.CampoInicio, Assert.Throws<RegraNegocioException>(() => Request(inicio: null).ParaDados()).Campo);
    }

    private sealed class RepositorioCasamentosMemoria : ICasamentoRepository
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

    private sealed class RepositorioItensMemoria : IItemCronogramaRepository
    {
        public List<ItemCronograma> Itens { get; } = [];

        public Task<IReadOnlyList<ItemCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<ItemCronograma> resultado = Itens.Where(item => item.CasamentoId == casamentoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<ItemCronograma?> ObterPorIdAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(item => item.CasamentoId == casamentoId && item.Id == itemId));
        }

        public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.Count(item => item.CasamentoId == casamentoId));
        }

        public void Adicionar(ItemCronograma item)
        {
            Itens.Add(item);
        }

        public void Remover(ItemCronograma item)
        {
            Itens.Remove(item);
        }
    }

    private sealed class UnidadeTrabalhoContador : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            Salvamentos++;
            return Task.CompletedTask;
        }
    }
}
