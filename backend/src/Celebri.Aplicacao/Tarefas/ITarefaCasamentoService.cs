namespace Casamento.Aplicacao.Tarefas;

public interface ITarefaCasamentoService
{
    Task<ListaTarefasDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<TarefaDto> ObterAsync(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento);

    Task<TarefaDto> CriarAsync(Guid casamentoId, SalvarTarefaRequest request, CancellationToken cancelamento);

    Task<TarefaDto> AtualizarAsync(Guid casamentoId, Guid tarefaId, SalvarTarefaRequest request, CancellationToken cancelamento);

    Task<TarefaDto> AlterarStatusAsync(Guid casamentoId, Guid tarefaId, AlterarStatusTarefaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento);

    Task<PendenciasTarefasDto> ObterPendenciasAsync(CancellationToken cancelamento);
}
