namespace Casamento.Aplicacao.ModelosCronograma;

public interface IAplicacaoModeloCronogramaService
{
    Task<AplicacaoModeloCronogramaDto> PreverAsync(Guid casamentoId, Guid modeloId, CancellationToken cancelamento);

    Task<AplicacaoModeloCronogramaDto> AplicarAsync(
        Guid casamentoId,
        AplicarModeloCronogramaRequest request,
        CancellationToken cancelamento);

    Task<RecalculoHorariosDto> ConsultarRecalculoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<RecalculoHorariosDto> RecalcularAsync(Guid casamentoId, CancellationToken cancelamento);
}
