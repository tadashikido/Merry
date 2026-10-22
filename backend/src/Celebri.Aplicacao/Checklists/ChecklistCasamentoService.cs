using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.Tarefas;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Checklists;

public class ChecklistCasamentoService : IChecklistCasamentoService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IModeloChecklistRepository _modeloRepository;
    private readonly ITarefaCasamentoRepository _tarefaRepository;
    private readonly IChecklistRepository _checklistRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public ChecklistCasamentoService(
        ICasamentoRepository casamentoRepository,
        IModeloChecklistRepository modeloRepository,
        ITarefaCasamentoRepository tarefaRepository,
        IChecklistRepository checklistRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _casamentoRepository = casamentoRepository;
        _modeloRepository = modeloRepository;
        _tarefaRepository = tarefaRepository;
        _checklistRepository = checklistRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<ChecklistCasamentoDto> ObterAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var tarefas = await _checklistRepository.ListarTarefasAsync(casamento.Id, cancelamento);
        var desatualizadas = await ListarDesatualizadasAsync(casamento, rastrear: false, cancelamento);
        var hoje = _calendario.Hoje();

        var ordenadas = tarefas
            .OrderBy(tarefa => tarefa.Prazo is null)
            .ThenBy(tarefa => tarefa.Prazo)
            .ThenBy(tarefa => tarefa.Titulo, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(tarefa => tarefa.Id)
            .ToList();

        return new ChecklistCasamentoDto(
            ParaDto(Calcular(tarefas)),
            casamento.Data,
            casamento.Arquivado,
            desatualizadas.Count,
            ordenadas.Select(tarefa => TarefaCasamentoService.ParaDto(tarefa, hoje)).ToList());
    }

    public async Task<AplicacaoModeloChecklistDto> PreverAplicacaoAsync(Guid casamentoId, Guid modeloId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var plano = await PlanejarAsync(casamento, modeloId, cancelamento);
        var progresso = await _checklistRepository.ObterProgressoAsync(casamento.Id, cancelamento);

        return plano.ParaDto(plano.Pendentes.Count, progresso);
    }

    public async Task<AplicacaoModeloChecklistDto> AplicarAsync(
        Guid casamentoId,
        AplicarModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modeloId = request.ModeloId ?? throw new RegraNegocioException(MensagensChecklist.ModeloObrigatorio);
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var plano = await PlanejarAsync(casamento, modeloId, cancelamento);

        if (plano.ExcedeLimite)
        {
            throw new RegraNegocioException(MensagensChecklist.LimiteTarefas(plano.TarefasNoCasamento, plano.Pendentes.Count));
        }

        var tarefas = GeradorTarefasChecklist.Gerar(casamento, plano.Pendentes, _usuarioAtual.UsuarioId, _relogio.GetUtcNow());

        foreach (var tarefa in tarefas)
        {
            _tarefaRepository.Adicionar(tarefa);
        }

        if (tarefas.Count > 0)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        var progresso = await _checklistRepository.ObterProgressoAsync(casamento.Id, cancelamento);
        return plano.ParaDto(tarefas.Count, progresso);
    }

    public async Task<RecalculoPrazosDto> ConsultarRecalculoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var desatualizadas = await ListarDesatualizadasAsync(casamento, rastrear: false, cancelamento);
        return new RecalculoPrazosDto(desatualizadas.Count);
    }

    public async Task<RecalculoPrazosDto> RecalcularPrazosAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var desatualizadas = await ListarDesatualizadasAsync(casamento, rastrear: true, cancelamento);
        var agora = _relogio.GetUtcNow();

        foreach (var item in desatualizadas)
        {
            item.Tarefa.RedefinirPrazo(ItemModeloChecklist.CalcularPrazo(casamento.Data, item.DiasAntesDoCasamento), agora);
        }

        if (desatualizadas.Count > 0)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return new RecalculoPrazosDto(desatualizadas.Count);
    }

    public static ProgressoChecklistDto ParaDto(ProgressoChecklist progresso)
    {
        ArgumentNullException.ThrowIfNull(progresso);

        return new ProgressoChecklistDto(
            progresso.Percentual,
            progresso.Concluidas,
            progresso.Consideradas,
            progresso.Canceladas,
            progresso.Total);
    }

    public static ProgressoChecklist Calcular(IReadOnlyCollection<TarefaCasamento> tarefas)
    {
        ArgumentNullException.ThrowIfNull(tarefas);

        var doChecklist = tarefas.Where(tarefa => tarefa.OrigemModeloItemId is not null).ToList();

        return new ProgressoChecklist(
            doChecklist.Count,
            doChecklist.Count(tarefa => tarefa.Status == StatusTarefa.Concluida),
            doChecklist.Count(tarefa => tarefa.Status == StatusTarefa.Cancelada));
    }

    private async Task<PlanoAplicacao> PlanejarAsync(CasamentoAssessorado casamento, Guid modeloId, CancellationToken cancelamento)
    {
        var modelo = await _modeloRepository.ObterComItensAsync(modeloId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensChecklist.ModeloNaoEncontrado);

        var itens = modelo.ItensOrdenados();
        var aplicadas = await _checklistRepository.ListarOrigensAplicadasAsync(
            casamento.Id,
            itens.Select(item => item.Id).ToList(),
            cancelamento);
        var pendentes = GeradorTarefasChecklist.ItensPendentes(itens, aplicadas);
        var existentes = await _tarefaRepository.ContarPorCasamentoAsync(casamento.Id, cancelamento);
        var hoje = _calendario.Hoje();
        var atrasadas = pendentes.Count(item => item.CalcularPrazo(casamento.Data) < hoje);

        return new PlanoAplicacao(
            itens.Count,
            pendentes,
            itens.Count - pendentes.Count,
            atrasadas,
            existentes,
            existentes + pendentes.Count > TarefaCasamento.LimitePorCasamento);
    }

    private async Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarDesatualizadasAsync(
        CasamentoAssessorado casamento,
        bool rastrear,
        CancellationToken cancelamento)
    {
        var abertas = await _checklistRepository.ListarAbertasComPrazoRelativoAsync(casamento.Id, rastrear, cancelamento);

        return abertas
            .Where(item => GeradorTarefasChecklist.PrazoDesatualizado(item.Tarefa, item.DiasAntesDoCasamento, casamento.Data))
            .ToList();
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private async Task<CasamentoAssessorado> ObterCasamentoEditavelAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensCasamento.ArquivadoSemEdicao);
        }

        return casamento;
    }

    private sealed record PlanoAplicacao(
        int ItensNoModelo,
        IReadOnlyList<ItemModeloChecklist> Pendentes,
        int JaAplicadas,
        int NascemAtrasadas,
        int TarefasNoCasamento,
        bool ExcedeLimite)
    {
        public AplicacaoModeloChecklistDto ParaDto(int tarefasCriadas, ProgressoChecklist progresso)
        {
            return new AplicacaoModeloChecklistDto(
                ItensNoModelo,
                tarefasCriadas,
                JaAplicadas,
                NascemAtrasadas,
                TarefasNoCasamento,
                ExcedeLimite,
                ChecklistCasamentoService.ParaDto(progresso));
        }
    }
}
