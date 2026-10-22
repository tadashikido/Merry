using Celebri.Aplicacao.Checklists;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Tarefas;

namespace Celebri.Testes.Unidade.Checklists;

public sealed class RepositorioChecklistMemoria : IChecklistRepository
{
    public List<TarefaCasamento> Tarefas { get; } = [];

    public List<ItemModeloChecklist> Itens { get; } = [];

    public Task<ProgressoChecklist> ObterProgressoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return Task.FromResult(ChecklistCasamentoService.Calcular(DoChecklist(casamentoId).ToList()));
    }

    public Task<IReadOnlyList<TarefaCasamento>> ListarTarefasAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        IReadOnlyList<TarefaCasamento> resultado = DoChecklist(casamentoId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid casamentoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento)
    {
        IReadOnlyList<Guid> resultado = DoChecklist(casamentoId)
            .Select(tarefa => tarefa.OrigemModeloItemId!.Value)
            .Where(itensModelo.Contains)
            .ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarAbertasComPrazoRelativoAsync(
        Guid casamentoId,
        bool rastrear,
        CancellationToken cancelamento)
    {
        IReadOnlyList<TarefaComPrazoRelativo> resultado = DoChecklist(casamentoId)
            .Where(tarefa => tarefa.EstaAberta)
            .Join(Itens, tarefa => tarefa.OrigemModeloItemId, item => item.Id, (tarefa, item) => new TarefaComPrazoRelativo(tarefa, item.DiasAntesDoCasamento))
            .ToList();
        return Task.FromResult(resultado);
    }

    private IEnumerable<TarefaCasamento> DoChecklist(Guid casamentoId)
    {
        return Tarefas.Where(tarefa => tarefa.CasamentoId == casamentoId && tarefa.OrigemModeloItemId is not null);
    }
}
