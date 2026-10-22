using Celebri.Aplicacao.Checklists;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Persistencia;

public interface IChecklistRepository
{
    Task<ProgressoChecklist> ObterProgressoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<IReadOnlyList<TarefaEvento>> ListarTarefasAsync(Guid eventoId, CancellationToken cancelamento);

    Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid eventoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento);

    Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarAbertasComPrazoRelativoAsync(
        Guid eventoId,
        bool rastrear,
        CancellationToken cancelamento);
}
