namespace Casamento.Aplicacao.Checklists;

public interface IModeloChecklistService
{
    Task<IReadOnlyList<ModeloChecklistResumoDto>> ListarAsync(CancellationToken cancelamento);

    Task<ModeloChecklistDto> ObterAsync(Guid modeloId, CancellationToken cancelamento);

    Task<ModeloChecklistDto> CriarAsync(SalvarModeloChecklistRequest request, CancellationToken cancelamento);

    Task<ModeloChecklistDto> AtualizarAsync(Guid modeloId, SalvarModeloChecklistRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid modeloId, CancellationToken cancelamento);

    Task<ItemModeloChecklistDto> CriarItemAsync(Guid modeloId, SalvarItemModeloChecklistRequest request, CancellationToken cancelamento);

    Task<ItemModeloChecklistDto> AtualizarItemAsync(
        Guid modeloId,
        Guid itemId,
        SalvarItemModeloChecklistRequest request,
        CancellationToken cancelamento);

    Task RemoverItemAsync(Guid modeloId, Guid itemId, CancellationToken cancelamento);

    Task GarantirModeloSugeridoAsync(CancellationToken cancelamento);
}
