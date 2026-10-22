namespace Celebri.Aplicacao.Checklists;

public interface IChecklistEventoService
{
    Task<ChecklistEventoDto> ObterAsync(Guid eventoId, CancellationToken cancelamento);

    Task<AplicacaoModeloChecklistDto> PreverAplicacaoAsync(Guid eventoId, Guid modeloId, CancellationToken cancelamento);

    Task<AplicacaoModeloChecklistDto> AplicarAsync(Guid eventoId, AplicarModeloChecklistRequest request, CancellationToken cancelamento);

    Task<RecalculoPrazosDto> ConsultarRecalculoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<RecalculoPrazosDto> RecalcularPrazosAsync(Guid eventoId, CancellationToken cancelamento);
}
