namespace Celebri.Aplicacao.Cronogramas;

public interface ICronogramaService
{
    Task<CronogramaDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<ItemCronogramaDto> ObterAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento);

    Task<ItemCronogramaDto> CriarAsync(Guid casamentoId, SalvarItemCronogramaRequest request, CancellationToken cancelamento);

    Task<ItemCronogramaDto> AtualizarAsync(
        Guid casamentoId,
        Guid itemId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento);
}
