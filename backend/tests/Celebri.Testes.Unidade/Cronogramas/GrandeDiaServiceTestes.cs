using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.GrandeDia;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Fornecedores;
using Casamento.Testes.Unidade.Autenticacao.Fakes;
using Casamento.Testes.Unidade.Fornecedores;

namespace Casamento.Testes.Unidade.Cronogramas;

public class GrandeDiaServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 5, 15, 19, 34, 0, TimeSpan.Zero);
    private static readonly DateOnly DataCasamento = new(2027, 5, 15);

    private readonly RepositorioCasamentosMemoria _casamentos = new();
    private readonly RepositorioItensMemoria _itens = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly UnidadeTrabalhoControlada _unidadeTrabalho = new();
    private readonly CalendarioLocalFixo _calendario = new(DataCasamento) { Hora = new TimeOnly(16, 34) };
    private readonly CasamentoAssessorado _casamento;

    public GrandeDiaServiceTestes()
    {
        _casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Luísa", "Pedro", DataCasamento, new TimeOnly(16, 30), "Capela São José", "Espaço Jardim", null, null),
            Agora);
        _casamentos.Itens.Add(_casamento);
    }

    private GrandeDiaService Service(IUsuarioAtual? usuario = null)
    {
        return new GrandeDiaService(
            _casamentos,
            _itens,
            _vinculos,
            _unidadeTrabalho,
            _calendario,
            new RelogioFixo(Agora),
            usuario ?? UsuarioAtualFalso.Dono());
    }

    private ItemCronograma Adicionar(int hora, int minuto, int? duracao, string atividade, Guid? fornecedor = null, Guid? casamentoId = null)
    {
        var item = ItemCronograma.Criar(
            casamentoId ?? _casamento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoCasamento, new TimeOnly(hora, minuto), duracao, atividade, "Capela", "Fernanda", fornecedor, "Instruções", "Pagar saldo"),
            null,
            Agora);
        _itens.Itens.Add(item);
        return item;
    }

    private Guid AdicionarVinculo(string? telefone = "11987654321")
    {
        var fornecedor = Fornecedor.Criar(
            new DadosFornecedor(CategoriaFornecedor.Musica, "Coral Harmonia", "Carla", telefone, null, null, null, null),
            Agora);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        var vinculo = FornecedorCasamento.Criar(
            _casamento.Id,
            fornecedor.Id,
            new DadosFornecedorCasamento("Música", 1_000m, null, StatusFornecedorCasamento.Cotacao, null),
            null,
            Agora);
        _vinculos.Itens.Add(vinculo);
        return vinculo.Id;
    }

    [Fact]
    public async Task Consultar_DeveMontarMomentoSituacoesEContatos()
    {
        var vinculo = AdicionarVinculo();
        Adicionar(17, 15, 45, "Fotos com a família");
        Adicionar(16, 30, 45, "Cerimônia", vinculo);
        Adicionar(14, 0, 90, "Montagem");

        var dto = await Service().ConsultarAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal(new DateTime(2027, 5, 15, 16, 34, 0), dto.Momento.Agora);
        Assert.Equal(DateTimeKind.Unspecified, dto.Momento.Agora.Kind);
        Assert.Equal("NoDia", dto.Momento.Fase);
        Assert.Equal(0, dto.Momento.DiasParaOCasamento);
        Assert.Equal(["Montagem", "Cerimônia", "Fotos com a família"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal(["SemMarcar", "Agora", "Proximo"], dto.Itens.Select(item => item.Situacao));
        var cerimonia = dto.Itens[1];
        Assert.Equal(new FornecedorGrandeDiaDto("Coral Harmonia", "Musica", "Carla", "11987654321"), cerimonia.Fornecedor);
        Assert.Equal("Pagar saldo", cerimonia.NotasInternas);
        Assert.Equal("16:30", dto.HorarioCerimonia);
        Assert.Equal("Luísa", dto.NomePrimeiraPessoa);
        Assert.False(dto.SomenteLeitura);
        Assert.False(dto.Arquivado);
    }

    [Fact]
    public async Task Consultar_ComoCasal_DeveSerSomenteLeituraSemNotasInternasEComContatos()
    {
        var vinculo = AdicionarVinculo();
        Adicionar(16, 30, 45, "Cerimônia", vinculo);

        var dto = await Service(UsuarioAtualFalso.Casal(_casamento.Id)).ConsultarAsync(_casamento.Id, CancellationToken.None);

        Assert.True(dto.SomenteLeitura);
        Assert.Null(dto.Itens[0].NotasInternas);
        Assert.Equal("11987654321", dto.Itens[0].Fornecedor!.Telefone);
    }

    [Fact]
    public async Task Consultar_CasamentoInexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ConsultarAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Concluir_DeveMarcarComInstanteDoServidorERecalcular()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        Adicionar(17, 15, 45, "Fotos");

        var dto = await Service().ConcluirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(StatusItemCronograma.Concluido, cerimonia.Status);
        Assert.Equal(Agora, cerimonia.ConcluidoEm);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal("Feito", dto.Itens[0].Situacao);
        Assert.Equal("Concluido", dto.Itens[0].Status);
        Assert.Equal(Agora, dto.Itens[0].ConcluidoEm);
        Assert.Equal("Proximo", dto.Itens[1].Situacao);
    }

    [Fact]
    public async Task Concluir_ItemJaFeito_DeveSerIdempotenteSemGravar()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        var antes = Agora.AddMinutes(-5);
        cerimonia.MarcarConcluido(antes);

        var dto = await Service().ConcluirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        Assert.Equal(antes, cerimonia.ConcluidoEm);
        Assert.Equal("Feito", dto.Itens[0].Situacao);
    }

    [Fact]
    public async Task Reabrir_DeveLimparConclusao()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        cerimonia.MarcarConcluido(Agora.AddMinutes(-5));

        var dto = await Service().ReabrirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(StatusItemCronograma.Previsto, cerimonia.Status);
        Assert.Null(cerimonia.ConcluidoEm);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal("Agora", dto.Itens[0].Situacao);
    }

    [Fact]
    public async Task Reabrir_ItemPrevisto_DeveSerIdempotente()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");

        await Service().ReabrirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Concluir_CasamentoArquivado_DeveLancarRegraDeNegocio()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        _casamento.Arquivar(Agora);

        await Assert.ThrowsAsync<RegraNegocioException>(() => Service().ConcluirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => Service().ReabrirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None));
        Assert.Equal(StatusItemCronograma.Previsto, cerimonia.Status);
    }

    [Fact]
    public async Task Consultar_CasamentoArquivado_DeveSerSomenteLeitura()
    {
        _casamento.Arquivar(Agora);

        var dto = await Service().ConsultarAsync(_casamento.Id, CancellationToken.None);

        Assert.True(dto.Arquivado);
        Assert.True(dto.SomenteLeitura);
    }

    [Fact]
    public async Task Concluir_ItemDeOutroCasamento_DeveLancarNaoEncontrado()
    {
        var outro = Adicionar(16, 30, 45, "Outro", casamentoId: Guid.NewGuid());

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ConcluirItemAsync(_casamento.Id, outro.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ConcluirItemAsync(_casamento.Id, Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Concluir_ConcorrenciaComMesmoResultado_DeveResponderSemErro()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        _unidadeTrabalho.FalharComConcorrencia = true;

        var dto = await Service().ConcluirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(1, _unidadeTrabalho.Descartes);
        Assert.Equal("Feito", dto.Itens[0].Situacao);
    }

    [Fact]
    public async Task Concluir_ConcorrenciaComEstadoDivergente_DeveLancarConcorrenciaAmigavel()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        _unidadeTrabalho.FalharComConcorrencia = true;
        _unidadeTrabalho.AoDescartar = () => cerimonia.Reabrir(Agora);

        var excecao = await Assert.ThrowsAsync<ConcorrenciaException>(() => Service().ConcluirItemAsync(_casamento.Id, cerimonia.Id, CancellationToken.None));

        Assert.Equal(MensagensGrandeDia.AtualizadoEmOutroAparelho, excecao.Message);
        Assert.IsType<ConcorrenciaException>(excecao.InnerException);
    }

    [Fact]
    public async Task Consultar_ForaDoDia_DeveInformarFaseEDias()
    {
        Adicionar(16, 30, 45, "Cerimônia");
        _calendario.Data = DataCasamento.AddDays(-12);

        var antes = await Service().ConsultarAsync(_casamento.Id, CancellationToken.None);
        _calendario.Data = DataCasamento.AddDays(3);
        var depois = await Service().ConsultarAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal("AntesDoDia", antes.Momento.Fase);
        Assert.Equal(12, antes.Momento.DiasParaOCasamento);
        Assert.Equal("Depois", antes.Itens[0].Situacao);
        Assert.Equal("DepoisDoDia", depois.Momento.Fase);
        Assert.Equal("SemMarcar", depois.Itens[0].Situacao);
    }

    [Fact]
    public void MomentoDto_DeveDescartarFracoesEFuso()
    {
        var retrato = MomentoGrandeDia.Calcular([], DataCasamento, new DateTime(2027, 5, 15, 10, 0, 0));
        var dto = MomentoGrandeDiaDto.De(retrato, new DateTime(2027, 5, 15, 10, 0, 5, 750, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2027, 5, 15, 10, 0, 5), dto.Agora);
        Assert.Equal(DateTimeKind.Unspecified, dto.Agora.Kind);
        Assert.Throws<ArgumentNullException>(() => MomentoGrandeDiaDto.De(null!, DateTime.Now));
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

    private sealed class UnidadeTrabalhoControlada : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public int Descartes { get; private set; }

        public bool FalharComConcorrencia { get; set; }

        public Action? AoDescartar { get; set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            if (FalharComConcorrencia)
            {
                throw new ConcorrenciaException("O registro foi alterado por outra operação.");
            }

            Salvamentos++;
            return Task.CompletedTask;
        }

        public void DescartarAlteracoes()
        {
            Descartes++;
            AoDescartar?.Invoke();
        }
    }
}
