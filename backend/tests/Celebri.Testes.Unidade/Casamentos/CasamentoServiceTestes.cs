using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Casamentos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Celebri.Testes.Unidade.Checklists;

namespace Celebri.Testes.Unidade.Casamentos;

public class CasamentoServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 11, 2, 30, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2027, 3, 10);

    private readonly RepositorioCasamentosMemoria _repositorio = new();
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly RelogioFixo _relogio = new(Agora);
    private readonly CasamentoService _service;

    public CasamentoServiceTestes()
    {
        _service = new CasamentoService(_repositorio, _unidadeTrabalho, new CalendarioFixo(Hoje), _relogio, UsuarioAtualFalso.Dono(), new RepositorioChecklistMemoria());
    }

    private static SalvarCasamentoRequest Request(
        DateOnly? data = null,
        string? horario = "16:30",
        string nomeSegundaPessoa = "Bruno")
    {
        return new SalvarCasamentoRequest(
            "Ana Beatriz",
            nomeSegundaPessoa,
            data ?? new DateOnly(2027, 5, 15),
            horario,
            "Capela São José",
            "  ",
            150,
            "Flores brancas");
    }

    [Fact]
    public async Task Criar_DeveAdicionarSalvarERetornarDtoComFaseEDias()
    {
        var dto = await _service.CriarAsync(Request(data: Hoje.AddDays(30)), CancellationToken.None);

        Assert.Single(_repositorio.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(_repositorio.Itens[0].Id, dto.Id);
        Assert.Equal("RetaFinal", dto.Fase);
        Assert.Equal(30, dto.DiasRestantes);
        Assert.Equal("16:30", dto.Horario);
        Assert.Null(dto.LocalRecepcao);
        Assert.False(dto.Arquivado);
        Assert.Equal(Agora, dto.CriadoEm);
    }

    [Fact]
    public async Task Criar_HorarioAusente_DeveRetornarHorarioNulo()
    {
        var dto = await _service.CriarAsync(Request(horario: null), CancellationToken.None);

        Assert.Null(dto.Horario);
    }

    [Fact]
    public async Task Criar_DadosInvalidos_NaoDeveSalvar()
    {
        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.CriarAsync(Request(data: new DateOnly(1999, 1, 1)), CancellationToken.None));

        Assert.Empty(_repositorio.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Obter_Inexistente_DeveLancarRecursoNaoEncontrado()
    {
        var excecao = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.ObterAsync(Guid.NewGuid(), CancellationToken.None));

        Assert.Equal(MensagensCasamento.NaoEncontrado, excecao.Message);
    }

    [Fact]
    public async Task Listar_Ativos_DeveOrdenarEExcluirArquivados()
    {
        var realizado = await _service.CriarAsync(Request(data: Hoje.AddDays(-3)), CancellationToken.None);
        var distante = await _service.CriarAsync(Request(data: Hoje.AddDays(120)), CancellationToken.None);
        var hoje = await _service.CriarAsync(Request(data: Hoje), CancellationToken.None);
        var arquivado = await _service.CriarAsync(Request(data: Hoje.AddDays(5)), CancellationToken.None);
        await _service.ArquivarAsync(arquivado.Id, CancellationToken.None);

        var lista = await _service.ListarAsync(SituacaoListagemCasamentos.Ativos, CancellationToken.None);

        Assert.Equal([hoje.Id, distante.Id, realizado.Id], lista.Select(item => item.Id));
        Assert.Equal(["DiaDoCasamento", "Planejamento", "Realizado"], lista.Select(item => item.Fase));
        Assert.Equal([0, 120, -3], lista.Select(item => item.DiasRestantes));
    }

    [Fact]
    public async Task Listar_Arquivados_DeveTrazerSomenteArquivados()
    {
        await _service.CriarAsync(Request(), CancellationToken.None);
        var arquivado = await _service.CriarAsync(Request(nomeSegundaPessoa: "Carla"), CancellationToken.None);
        await _service.ArquivarAsync(arquivado.Id, CancellationToken.None);

        var lista = await _service.ListarAsync(SituacaoListagemCasamentos.Arquivados, CancellationToken.None);

        var item = Assert.Single(lista);
        Assert.Equal(arquivado.Id, item.Id);
        Assert.True(item.Arquivado);
    }

    [Fact]
    public async Task Listar_SituacaoInvalida_DeveLancarRegraNegocio()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ListarAsync((SituacaoListagemCasamentos)99, CancellationToken.None));

        Assert.Equal(MensagensCasamento.SituacaoInvalida, excecao.Message);
    }

    [Fact]
    public async Task Atualizar_DeveAlterarESalvar()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);
        _relogio.Avancar(TimeSpan.FromHours(1));

        var atualizado = await _service.AtualizarAsync(criado.Id, Request(nomeSegundaPessoa: "Bruna", horario: null), CancellationToken.None);

        Assert.Equal("Bruna", atualizado.NomeSegundaPessoa);
        Assert.Null(atualizado.Horario);
        Assert.Equal(Agora.AddHours(1), atualizado.AtualizadoEm);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Atualizar_Arquivado_DeveLancarRegraNegocioSemSalvar()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);
        await _service.ArquivarAsync(criado.Id, CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.AtualizarAsync(criado.Id, Request(nomeSegundaPessoa: "Outra"), CancellationToken.None));

        Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, excecao.Message);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Atualizar_Inexistente_DeveLancarRecursoNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.AtualizarAsync(Guid.NewGuid(), Request(), CancellationToken.None));
    }

    [Fact]
    public async Task ArquivarERestaurar_DevemRetornarSituacaoAtualizada()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);

        var arquivado = await _service.ArquivarAsync(criado.Id, CancellationToken.None);
        var restaurado = await _service.RestaurarAsync(criado.Id, CancellationToken.None);

        Assert.True(arquivado.Arquivado);
        Assert.Equal(Agora, arquivado.ArquivadoEm);
        Assert.False(restaurado.Arquivado);
        Assert.Null(restaurado.ArquivadoEm);
    }

    [Fact]
    public async Task ArquivarERestaurar_Inexistente_DevemLancarRecursoNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.ArquivarAsync(Guid.NewGuid(), CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.RestaurarAsync(Guid.NewGuid(), CancellationToken.None));
    }

    private sealed class CalendarioFixo : ICalendarioLocal
    {
        private readonly DateOnly _hoje;

        public CalendarioFixo(DateOnly hoje)
        {
            _hoje = hoje;
        }

        public DateOnly Hoje()
        {
            return _hoje;
        }

        public DateTime Agora()
        {
            return _hoje.ToDateTime(new TimeOnly(12, 0));
        }
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
