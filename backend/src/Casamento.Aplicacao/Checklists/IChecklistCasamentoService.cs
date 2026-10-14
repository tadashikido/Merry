namespace Casamento.Aplicacao.Checklists;

public interface IChecklistCasamentoService
{
    Task<ChecklistCasamentoDto> ObterAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<AplicacaoModeloChecklistDto> PreverAplicacaoAsync(Guid casamentoId, Guid modeloId, CancellationToken cancelamento);

    Task<AplicacaoModeloChecklistDto> AplicarAsync(Guid casamentoId, AplicarModeloChecklistRequest request, CancellationToken cancelamento);

    Task<RecalculoPrazosDto> ConsultarRecalculoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<RecalculoPrazosDto> RecalcularPrazosAsync(Guid casamentoId, CancellationToken cancelamento);
}
