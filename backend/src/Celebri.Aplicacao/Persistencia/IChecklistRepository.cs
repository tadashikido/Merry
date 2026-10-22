using Casamento.Aplicacao.Checklists;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Persistencia;

public interface IChecklistRepository
{
    Task<ProgressoChecklist> ObterProgressoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<IReadOnlyList<TarefaCasamento>> ListarTarefasAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid casamentoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento);

    Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarAbertasComPrazoRelativoAsync(
        Guid casamentoId,
        bool rastrear,
        CancellationToken cancelamento);
}
