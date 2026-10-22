namespace Celebri.Aplicacao.Cronogramas;

public interface ICronogramaService
{
    Task<CronogramaDto> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<ItemCronogramaDto> ObterAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento);

    Task<ItemCronogramaDto> CriarAsync(Guid eventoId, SalvarItemCronogramaRequest request, CancellationToken cancelamento);

    Task<ItemCronogramaDto> AtualizarAsync(
        Guid eventoId,
        Guid itemId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento);
}
