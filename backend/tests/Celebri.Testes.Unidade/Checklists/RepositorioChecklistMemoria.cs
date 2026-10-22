using Celebri.Aplicacao.Checklists;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Tarefas;

namespace Celebri.Testes.Unidade.Checklists;

public sealed class RepositorioChecklistMemoria : IChecklistRepository
{
    public List<TarefaEvento> Tarefas { get; } = [];

    public List<ItemModeloChecklist> Itens { get; } = [];

    public Task<ProgressoChecklist> ObterProgressoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return Task.FromResult(ChecklistEventoService.Calcular(DoChecklist(eventoId).ToList()));
    }

    public Task<IReadOnlyList<TarefaEvento>> ListarTarefasAsync(Guid eventoId, CancellationToken cancelamento)
    {
        IReadOnlyList<TarefaEvento> resultado = DoChecklist(eventoId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid eventoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento)
    {
        IReadOnlyList<Guid> resultado = DoChecklist(eventoId)
            .Select(tarefa => tarefa.OrigemModeloItemId!.Value)
            .Where(itensModelo.Contains)
            .ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarAbertasComPrazoRelativoAsync(
        Guid eventoId,
        bool rastrear,
        CancellationToken cancelamento)
    {
        IReadOnlyList<TarefaComPrazoRelativo> resultado = DoChecklist(eventoId)
            .Where(tarefa => tarefa.EstaAberta)
            .Join(Itens, tarefa => tarefa.OrigemModeloItemId, item => item.Id, (tarefa, item) => new TarefaComPrazoRelativo(tarefa, item.DiasAntesDoEvento))
            .ToList();
        return Task.FromResult(resultado);
    }

    private IEnumerable<TarefaEvento> DoChecklist(Guid eventoId)
    {
        return Tarefas.Where(tarefa => tarefa.EventoId == eventoId && tarefa.OrigemModeloItemId is not null);
    }
}
