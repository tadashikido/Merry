using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Tarefas;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Checklists;

public class ChecklistEventoService : IChecklistEventoService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IModeloChecklistRepository _modeloRepository;
    private readonly ITarefaEventoRepository _tarefaRepository;
    private readonly IChecklistRepository _checklistRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public ChecklistEventoService(
        IEventoRepository eventoRepository,
        IModeloChecklistRepository modeloRepository,
        ITarefaEventoRepository tarefaRepository,
        IChecklistRepository checklistRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _modeloRepository = modeloRepository;
        _tarefaRepository = tarefaRepository;
        _checklistRepository = checklistRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<ChecklistEventoDto> ObterAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var tarefas = await _checklistRepository.ListarTarefasAsync(evento.Id, cancelamento);
        var desatualizadas = await ListarDesatualizadasAsync(evento, rastrear: false, cancelamento);
        var hoje = _calendario.Hoje();

        var ordenadas = tarefas
            .OrderBy(tarefa => tarefa.Prazo is null)
            .ThenBy(tarefa => tarefa.Prazo)
            .ThenBy(tarefa => tarefa.Titulo, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(tarefa => tarefa.Id)
            .ToList();

        return new ChecklistEventoDto(
            ParaDto(Calcular(tarefas)),
            evento.Data,
            evento.Arquivado,
            desatualizadas.Count,
            ordenadas.Select(tarefa => TarefaEventoService.ParaDto(tarefa, hoje)).ToList());
    }

    public async Task<AplicacaoModeloChecklistDto> PreverAplicacaoAsync(Guid eventoId, Guid modeloId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var plano = await PlanejarAsync(evento, modeloId, cancelamento);
        var progresso = await _checklistRepository.ObterProgressoAsync(evento.Id, cancelamento);

        return plano.ParaDto(plano.Pendentes.Count, progresso);
    }

    public async Task<AplicacaoModeloChecklistDto> AplicarAsync(
        Guid eventoId,
        AplicarModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modeloId = request.ModeloId ?? throw new RegraNegocioException(MensagensChecklist.ModeloObrigatorio);
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var plano = await PlanejarAsync(evento, modeloId, cancelamento);

        if (plano.ExcedeLimite)
        {
            throw new RegraNegocioException(MensagensChecklist.LimiteTarefas(plano.TarefasNoEvento, plano.Pendentes.Count));
        }

        var tarefas = GeradorTarefasChecklist.Gerar(evento, plano.Pendentes, _usuarioAtual.UsuarioId, _relogio.GetUtcNow());

        foreach (var tarefa in tarefas)
        {
            _tarefaRepository.Adicionar(tarefa);
        }

        if (tarefas.Count > 0)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        var progresso = await _checklistRepository.ObterProgressoAsync(evento.Id, cancelamento);
        return plano.ParaDto(tarefas.Count, progresso);
    }

    public async Task<RecalculoPrazosDto> ConsultarRecalculoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var desatualizadas = await ListarDesatualizadasAsync(evento, rastrear: false, cancelamento);
        return new RecalculoPrazosDto(desatualizadas.Count);
    }

    public async Task<RecalculoPrazosDto> RecalcularPrazosAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var desatualizadas = await ListarDesatualizadasAsync(evento, rastrear: true, cancelamento);
        var agora = _relogio.GetUtcNow();

        foreach (var item in desatualizadas)
        {
            item.Tarefa.RedefinirPrazo(ItemModeloChecklist.CalcularPrazo(evento.Data, item.DiasAntesDoEvento), agora);
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

    public static ProgressoChecklist Calcular(IReadOnlyCollection<TarefaEvento> tarefas)
    {
        ArgumentNullException.ThrowIfNull(tarefas);

        var doChecklist = tarefas.Where(tarefa => tarefa.OrigemModeloItemId is not null).ToList();

        return new ProgressoChecklist(
            doChecklist.Count,
            doChecklist.Count(tarefa => tarefa.Status == StatusTarefa.Concluida),
            doChecklist.Count(tarefa => tarefa.Status == StatusTarefa.Cancelada));
    }

    private async Task<PlanoAplicacao> PlanejarAsync(Evento evento, Guid modeloId, CancellationToken cancelamento)
    {
        var modelo = await _modeloRepository.ObterComItensAsync(modeloId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensChecklist.ModeloNaoEncontrado);

        var itens = modelo.ItensOrdenados();
        var aplicadas = await _checklistRepository.ListarOrigensAplicadasAsync(
            evento.Id,
            itens.Select(item => item.Id).ToList(),
            cancelamento);
        var pendentes = GeradorTarefasChecklist.ItensPendentes(itens, aplicadas);
        var existentes = await _tarefaRepository.ContarPorEventoAsync(evento.Id, cancelamento);
        var hoje = _calendario.Hoje();
        var atrasadas = pendentes.Count(item => item.CalcularPrazo(evento.Data) < hoje);

        return new PlanoAplicacao(
            itens.Count,
            pendentes,
            itens.Count - pendentes.Count,
            atrasadas,
            existentes,
            existentes + pendentes.Count > TarefaEvento.LimitePorEvento);
    }

    private async Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarDesatualizadasAsync(
        Evento evento,
        bool rastrear,
        CancellationToken cancelamento)
    {
        var abertas = await _checklistRepository.ListarAbertasComPrazoRelativoAsync(evento.Id, rastrear, cancelamento);

        return abertas
            .Where(item => GeradorTarefasChecklist.PrazoDesatualizado(item.Tarefa, item.DiasAntesDoEvento, evento.Data))
            .ToList();
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<Evento> ObterEventoEditavelAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensEvento.ArquivadoSemEdicao);
        }

        return evento;
    }

    private sealed record PlanoAplicacao(
        int ItensNoModelo,
        IReadOnlyList<ItemModeloChecklist> Pendentes,
        int JaAplicadas,
        int NascemAtrasadas,
        int TarefasNoEvento,
        bool ExcedeLimite)
    {
        public AplicacaoModeloChecklistDto ParaDto(int tarefasCriadas, ProgressoChecklist progresso)
        {
            return new AplicacaoModeloChecklistDto(
                ItensNoModelo,
                tarefasCriadas,
                JaAplicadas,
                NascemAtrasadas,
                TarefasNoEvento,
                ExcedeLimite,
                ChecklistEventoService.ParaDto(progresso));
        }
    }
}
