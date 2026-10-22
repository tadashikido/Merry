namespace Celebri.Aplicacao.ModelosCronograma;

public interface IAplicacaoModeloCronogramaService
{
    Task<AplicacaoModeloCronogramaDto> PreverAsync(Guid eventoId, Guid modeloId, CancellationToken cancelamento);

    Task<AplicacaoModeloCronogramaDto> AplicarAsync(
        Guid eventoId,
        AplicarModeloCronogramaRequest request,
        CancellationToken cancelamento);

    Task<RecalculoHorariosDto> ConsultarRecalculoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<RecalculoHorariosDto> RecalcularAsync(Guid eventoId, CancellationToken cancelamento);
}
