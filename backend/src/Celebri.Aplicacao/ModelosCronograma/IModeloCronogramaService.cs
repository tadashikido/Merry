namespace Celebri.Aplicacao.ModelosCronograma;

public interface IModeloCronogramaService
{
    Task<IReadOnlyList<ModeloCronogramaResumoDto>> ListarAsync(CancellationToken cancelamento);

    Task<ModeloCronogramaDto> ObterAsync(Guid modeloId, CancellationToken cancelamento);

    Task<ModeloCronogramaDto> CriarAsync(SalvarModeloCronogramaRequest request, CancellationToken cancelamento);

    Task<ModeloCronogramaDto> CriarDoEventoAsync(
        Guid eventoId,
        SalvarModeloCronogramaRequest request,
        CancellationToken cancelamento);

    Task<ModeloCronogramaDto> AtualizarAsync(Guid modeloId, SalvarModeloCronogramaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid modeloId, CancellationToken cancelamento);

    Task<ItemModeloCronogramaDto> CriarItemAsync(
        Guid modeloId,
        SalvarItemModeloCronogramaRequest request,
        CancellationToken cancelamento);

    Task<ItemModeloCronogramaDto> AtualizarItemAsync(
        Guid modeloId,
        Guid itemId,
        SalvarItemModeloCronogramaRequest request,
        CancellationToken cancelamento);

    Task RemoverItemAsync(Guid modeloId, Guid itemId, CancellationToken cancelamento);

    Task GarantirModeloSugeridoAsync(CancellationToken cancelamento);
}
