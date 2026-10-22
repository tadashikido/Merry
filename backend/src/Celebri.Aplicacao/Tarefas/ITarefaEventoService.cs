namespace Celebri.Aplicacao.Tarefas;

public interface ITarefaEventoService
{
    Task<ListaTarefasDto> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<TarefaDto> ObterAsync(Guid eventoId, Guid tarefaId, CancellationToken cancelamento);

    Task<TarefaDto> CriarAsync(Guid eventoId, SalvarTarefaRequest request, CancellationToken cancelamento);

    Task<TarefaDto> AtualizarAsync(Guid eventoId, Guid tarefaId, SalvarTarefaRequest request, CancellationToken cancelamento);

    Task<TarefaDto> AlterarStatusAsync(Guid eventoId, Guid tarefaId, AlterarStatusTarefaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid tarefaId, CancellationToken cancelamento);

    Task<PendenciasTarefasDto> ObterPendenciasAsync(CancellationToken cancelamento);
}
