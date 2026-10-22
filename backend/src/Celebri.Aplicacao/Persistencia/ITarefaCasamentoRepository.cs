using Casamento.Aplicacao.Tarefas;
using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Persistencia;

public interface ITarefaCasamentoRepository
{
    Task<IReadOnlyList<TarefaCasamento>> ListarPorCasamentoAsync(
        Guid casamentoId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento);

    Task<TarefaCasamento?> ObterPorIdAsync(
        Guid casamentoId,
        Guid tarefaId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento);

    Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<PendenciasTarefas> ListarPendenciasAsync(DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento);

    void Adicionar(TarefaCasamento tarefa);

    void Remover(TarefaCasamento tarefa);
}
