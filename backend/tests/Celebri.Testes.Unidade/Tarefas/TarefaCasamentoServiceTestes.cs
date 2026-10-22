using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Tarefas;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Tarefas;
using Celebri.Testes.Unidade.Autenticacao.Fakes;

namespace Celebri.Testes.Unidade.Tarefas;

public class TarefaCasamentoServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 11, 2, 30, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2027, 3, 10);

    private readonly RepositorioCasamentosMemoria _casamentos = new();
    private readonly RepositorioTarefasMemoria _tarefas = new();
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly CasamentoAssessorado _casamento;

    public TarefaCasamentoServiceTestes()
    {
        _casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "João", new DateOnly(2027, 12, 12), null, null, null, null, null),
            Agora);
        _casamentos.Itens.Add(_casamento);
    }

    private TarefaCasamentoService Service(IUsuarioAtual? usuario = null)
    {
        return new TarefaCasamentoService(
            _casamentos,
            _tarefas,
            _unidadeTrabalho,
            new CalendarioFixo(Hoje),
            new RelogioFixo(Agora),
            usuario ?? UsuarioAtualFalso.Dono());
    }

    private static SalvarTarefaRequest Request(
        string titulo = "Contratar fotógrafo",
        ResponsavelTarefa? responsavel = ResponsavelTarefa.Assessoria,
        DateOnly? prazo = null,
        CategoriaTarefa? categoria = CategoriaTarefa.Fornecedores)
    {
        return new SalvarTarefaRequest(titulo, "  detalhes  ", responsavel, categoria, prazo);
    }

    private TarefaCasamento Adicionar(ResponsavelTarefa responsavel, DateOnly? prazo = null, string titulo = "Tarefa")
    {
        var tarefa = TarefaCasamento.Criar(_casamento.Id, new DadosTarefa(titulo, null, responsavel, CategoriaTarefa.Geral, prazo), null, Agora);
        _tarefas.Itens.Add(tarefa);
        return tarefa;
    }

    [Fact]
    public async Task Criar_DeveSalvarERetornarDtoComCalculosDoCalendario()
    {
        var dono = UsuarioAtualFalso.Dono();

        var dto = await Service(dono).CriarAsync(_casamento.Id, Request(prazo: Hoje.AddDays(-2)), CancellationToken.None);

        var tarefa = Assert.Single(_tarefas.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(tarefa.Id, dto.Id);
        Assert.Equal("AFazer", dto.Status);
        Assert.Equal("Assessoria", dto.Responsavel);
        Assert.Equal("Fornecedores", dto.Categoria);
        Assert.Equal("detalhes", dto.Descricao);
        Assert.True(dto.Atrasada);
        Assert.False(dto.VenceNaSemana);
        Assert.Equal(-2, dto.DiasParaPrazo);
        Assert.False(dto.GeradaDeModelo);
        Assert.Equal(dono.UsuarioId, tarefa.CriadoPorUsuarioId);
    }

    [Fact]
    public async Task Criar_ValoresPadrao_DeveUsarAssessoriaEGeral()
    {
        var dto = await Service().CriarAsync(_casamento.Id, new SalvarTarefaRequest("Revisar lista", null, null, null, null), CancellationToken.None);

        Assert.Equal("Assessoria", dto.Responsavel);
        Assert.Equal("Geral", dto.Categoria);
        Assert.Null(dto.Prazo);
        Assert.Null(dto.DiasParaPrazo);
    }

    [Fact]
    public async Task Criar_CasamentoInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            Service().CriarAsync(Guid.NewGuid(), Request(), CancellationToken.None));

        Assert.Empty(_tarefas.Itens);
    }

    [Fact]
    public async Task Escritas_EmCasamentoArquivado_DevemLancar422ELeituraContinuar()
    {
        var tarefa = Adicionar(ResponsavelTarefa.Casal);
        _casamento.Arquivar(Agora);
        var service = Service();

        var criar = await Assert.ThrowsAsync<RegraNegocioException>(() => service.CriarAsync(_casamento.Id, Request(), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => service.AtualizarAsync(_casamento.Id, tarefa.Id, Request(), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            service.AlterarStatusAsync(_casamento.Id, tarefa.Id, new AlterarStatusTarefaRequest(StatusTarefa.Concluida), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => service.RemoverAsync(_casamento.Id, tarefa.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            Service(UsuarioAtualFalso.Casal(_casamento.Id)).AlterarStatusAsync(
                _casamento.Id,
                tarefa.Id,
                new AlterarStatusTarefaRequest(StatusTarefa.Concluida),
                CancellationToken.None));

        Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, criar.Message);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        var lista = await service.ListarAsync(_casamento.Id, CancellationToken.None);
        Assert.True(lista.CasamentoArquivado);
        Assert.Single(lista.Tarefas);
    }

    [Fact]
    public async Task Criar_NoLimiteDoCasamento_DeveLancar422()
    {
        _tarefas.ContagemForcada = TarefaCasamento.LimitePorCasamento;

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            Service().CriarAsync(_casamento.Id, Request(), CancellationToken.None));

        Assert.Equal(MensagensTarefas.LimitePorCasamento, excecao.Message);
        Assert.Empty(_tarefas.Itens);
    }

    [Fact]
    public async Task Listar_Assessoria_DeveVerTudoOrdenadoEComResumo()
    {
        var semPrazo = Adicionar(ResponsavelTarefa.Assessoria, null, "Sem prazo");
        var adiante = Adicionar(ResponsavelTarefa.Casal, Hoje.AddDays(20), "Adiante");
        var atrasada = Adicionar(ResponsavelTarefa.Assessoria, Hoje.AddDays(-3), "Atrasada");
        var semana = Adicionar(ResponsavelTarefa.Casal, Hoje.AddDays(2), "Semana");
        var concluida = Adicionar(ResponsavelTarefa.Assessoria, Hoje.AddDays(-10), "Concluída");
        concluida.AlterarStatus(StatusTarefa.Concluida, ResponsavelTarefa.Assessoria, null, Agora);
        var cancelada = Adicionar(ResponsavelTarefa.Assessoria, null, "Cancelada");
        cancelada.AlterarStatus(StatusTarefa.Cancelada, ResponsavelTarefa.Assessoria, null, Agora.AddMinutes(-5));

        var lista = await Service().ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal(
            [atrasada.Id, semana.Id, adiante.Id, semPrazo.Id, concluida.Id, cancelada.Id],
            lista.Tarefas.Select(tarefa => tarefa.Id));
        Assert.Equal(new ResumoTarefasDto(4, 1, 1, 1, 1, 6), lista.Resumo);
        Assert.False(lista.SomenteDoCasal);
        Assert.Null(_tarefas.UltimoFiltroResponsavel);
    }

    [Fact]
    public async Task Listar_Casal_DeveFiltrarPorResponsavelCasal()
    {
        Adicionar(ResponsavelTarefa.Assessoria, null, "Interna");
        var doCasal = Adicionar(ResponsavelTarefa.Casal, null, "Do casal");

        var lista = await Service(UsuarioAtualFalso.Casal(_casamento.Id)).ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal(doCasal.Id, Assert.Single(lista.Tarefas).Id);
        Assert.True(lista.SomenteDoCasal);
        Assert.Equal(ResponsavelTarefa.Casal, _tarefas.UltimoFiltroResponsavel);
        Assert.Equal(1, lista.Resumo.Total);
    }

    [Fact]
    public async Task UsuarioSemPapelDeAssessoria_DeveReceberSempreOFiltroDoCasal()
    {
        Adicionar(ResponsavelTarefa.Assessoria);

        var lista = await Service(UsuarioAtualFalso.Anonimo()).ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.Empty(lista.Tarefas);
        Assert.Equal(ResponsavelTarefa.Casal, _tarefas.UltimoFiltroResponsavel);
    }

    [Fact]
    public async Task Casal_ObterOuAlterarTarefaDaAssessoria_DeveLancar404()
    {
        var interna = Adicionar(ResponsavelTarefa.Assessoria);
        var service = Service(UsuarioAtualFalso.Casal(_casamento.Id));

        var obter = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            service.ObterAsync(_casamento.Id, interna.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            service.AlterarStatusAsync(_casamento.Id, interna.Id, new AlterarStatusTarefaRequest(StatusTarefa.Concluida), CancellationToken.None));

        Assert.Equal(MensagensTarefas.NaoEncontrada, obter.Message);
        Assert.Equal(StatusTarefa.AFazer, interna.Status);
    }

    [Fact]
    public async Task Casal_ConcluirEReabrir_DeveRegistrarAutorCasal()
    {
        var tarefa = Adicionar(ResponsavelTarefa.Casal, Hoje.AddDays(-1));
        var casal = UsuarioAtualFalso.Casal(_casamento.Id);
        var service = Service(casal);

        var concluida = await service.AlterarStatusAsync(_casamento.Id, tarefa.Id, new AlterarStatusTarefaRequest(StatusTarefa.Concluida), CancellationToken.None);

        Assert.Equal("Concluida", concluida.Status);
        Assert.Equal("Casal", concluida.ConcluidaPor);
        Assert.Equal(Agora, concluida.ConcluidaEm);
        Assert.False(concluida.Atrasada);
        Assert.Equal(casal.UsuarioId, tarefa.ConcluidaPorUsuarioId);

        var reaberta = await service.AlterarStatusAsync(_casamento.Id, tarefa.Id, new AlterarStatusTarefaRequest(StatusTarefa.AFazer), CancellationToken.None);

        Assert.Equal("AFazer", reaberta.Status);
        Assert.Null(reaberta.ConcluidaPor);
        Assert.True(reaberta.Atrasada);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
    }

    [Theory]
    [InlineData(StatusTarefa.Cancelada)]
    [InlineData(StatusTarefa.EmAndamento)]
    public async Task Casal_StatusNaoPermitido_DeveLancar422(StatusTarefa status)
    {
        var tarefa = Adicionar(ResponsavelTarefa.Casal);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            Service(UsuarioAtualFalso.Casal(_casamento.Id)).AlterarStatusAsync(
                _casamento.Id,
                tarefa.Id,
                new AlterarStatusTarefaRequest(status),
                CancellationToken.None));

        Assert.Equal(MensagensTarefas.StatusNaoPermitidoCasal, excecao.Message);
        Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Theory]
    [InlineData(StatusTarefa.EmAndamento)]
    [InlineData(StatusTarefa.Cancelada)]
    [InlineData(StatusTarefa.Concluida)]
    public async Task Assessoria_PodeAplicarQualquerStatus(StatusTarefa status)
    {
        var tarefa = Adicionar(ResponsavelTarefa.Casal);

        var dto = await Service().AlterarStatusAsync(_casamento.Id, tarefa.Id, new AlterarStatusTarefaRequest(status), CancellationToken.None);

        Assert.Equal(status.ToString(), dto.Status);
        Assert.Equal(status == StatusTarefa.Concluida ? "Assessoria" : null, dto.ConcluidaPor);
    }

    [Fact]
    public async Task AlterarStatus_SemStatus_DeveLancar422()
    {
        var tarefa = Adicionar(ResponsavelTarefa.Assessoria);

        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            Service().AlterarStatusAsync(_casamento.Id, tarefa.Id, new AlterarStatusTarefaRequest(null), CancellationToken.None));
    }

    [Fact]
    public async Task Atualizar_DeveAlterarCamposERecalcular()
    {
        var tarefa = Adicionar(ResponsavelTarefa.Assessoria);

        var dto = await Service().AtualizarAsync(
            _casamento.Id,
            tarefa.Id,
            Request("Enviar lista de padrinhos", ResponsavelTarefa.Casal, Hoje, CategoriaTarefa.Cerimonia),
            CancellationToken.None);

        Assert.Equal("Enviar lista de padrinhos", dto.Titulo);
        Assert.Equal("Casal", dto.Responsavel);
        Assert.Equal("Cerimonia", dto.Categoria);
        Assert.True(dto.VenceNaSemana);
        Assert.Equal(0, dto.DiasParaPrazo);
    }

    [Fact]
    public async Task Remover_DeveExcluirESalvar()
    {
        var tarefa = Adicionar(ResponsavelTarefa.Assessoria);

        await Service().RemoverAsync(_casamento.Id, tarefa.Id, CancellationToken.None);

        Assert.Empty(_tarefas.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Remover_Inexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            Service().RemoverAsync(_casamento.Id, Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task ObterPendencias_DeveMapearDiasAPartirDeHoje()
    {
        _tarefas.Pendencias = new PendenciasTarefas(
            3,
            1,
            2,
            [new TarefaPendente(Guid.NewGuid(), _casamento.Id, "Ana", "João", "Assinar contrato", ResponsavelTarefa.Casal, CategoriaTarefa.Documentos, StatusTarefa.AFazer, Hoje.AddDays(-4))],
            [new TarefaPendente(Guid.NewGuid(), _casamento.Id, "Ana", "João", "Pagar parcela", ResponsavelTarefa.Casal, CategoriaTarefa.Financeiro, StatusTarefa.EmAndamento, Hoje)]);

        var dto = await Service().ObterPendenciasAsync(CancellationToken.None);

        Assert.Equal(3, dto.TotalAtrasadas);
        Assert.Equal(1, dto.TotalEstaSemana);
        Assert.Equal(2, dto.CasamentosComAtraso);
        Assert.Equal(-4, Assert.Single(dto.Atrasadas).DiasParaPrazo);
        Assert.Equal("Documentos", dto.Atrasadas[0].Categoria);
        Assert.Equal(0, Assert.Single(dto.EstaSemana).DiasParaPrazo);
        Assert.Equal("EmAndamento", dto.EstaSemana[0].Status);
        Assert.Equal(Hoje, _tarefas.HojePendencias);
        Assert.Equal(TarefaCasamentoService.LimitePendenciasPorGrupo, _tarefas.LimitePendencias);
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

    private sealed class RepositorioTarefasMemoria : ITarefaCasamentoRepository
    {
        public List<TarefaCasamento> Itens { get; } = [];

        public int? ContagemForcada { get; set; }

        public ResponsavelTarefa? UltimoFiltroResponsavel { get; private set; }

        public PendenciasTarefas Pendencias { get; set; } = new(0, 0, 0, [], []);

        public DateOnly? HojePendencias { get; private set; }

        public int? LimitePendencias { get; private set; }

        public Task<IReadOnlyList<TarefaCasamento>> ListarPorCasamentoAsync(
            Guid casamentoId,
            ResponsavelTarefa? somenteResponsavel,
            CancellationToken cancelamento)
        {
            UltimoFiltroResponsavel = somenteResponsavel;
            IReadOnlyList<TarefaCasamento> resultado = Filtrar(casamentoId, somenteResponsavel).ToList();
            return Task.FromResult(resultado);
        }

        public Task<TarefaCasamento?> ObterPorIdAsync(
            Guid casamentoId,
            Guid tarefaId,
            ResponsavelTarefa? somenteResponsavel,
            CancellationToken cancelamento)
        {
            UltimoFiltroResponsavel = somenteResponsavel;
            return Task.FromResult(Filtrar(casamentoId, somenteResponsavel).FirstOrDefault(tarefa => tarefa.Id == tarefaId));
        }

        public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ContagemForcada ?? Itens.Count(tarefa => tarefa.CasamentoId == casamentoId));
        }

        public Task<PendenciasTarefas> ListarPendenciasAsync(DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento)
        {
            HojePendencias = hoje;
            LimitePendencias = limitePorGrupo;
            return Task.FromResult(Pendencias);
        }

        public void Adicionar(TarefaCasamento tarefa)
        {
            Itens.Add(tarefa);
        }

        public void Remover(TarefaCasamento tarefa)
        {
            Itens.Remove(tarefa);
        }

        private IEnumerable<TarefaCasamento> Filtrar(Guid casamentoId, ResponsavelTarefa? somenteResponsavel)
        {
            return Itens.Where(tarefa =>
                tarefa.CasamentoId == casamentoId && (somenteResponsavel is null || tarefa.Responsavel == somenteResponsavel));
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
