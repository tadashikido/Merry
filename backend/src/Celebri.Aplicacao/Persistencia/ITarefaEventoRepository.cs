using Celebri.Aplicacao.Tarefas;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Persistencia;

public interface ITarefaEventoRepository
{
    Task<IReadOnlyList<TarefaEvento>> ListarPorEventoAsync(
        Guid eventoId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento);

    Task<TarefaEvento?> ObterPorIdAsync(
        Guid eventoId,
        Guid tarefaId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento);

    Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<PendenciasTarefas> ListarPendenciasAsync(DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento);

    void Adicionar(TarefaEvento tarefa);

    void Remover(TarefaEvento tarefa);
}
