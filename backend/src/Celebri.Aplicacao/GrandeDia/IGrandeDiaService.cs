namespace Celebri.Aplicacao.GrandeDia;

public interface IGrandeDiaService
{
    Task<GrandeDiaDto> ConsultarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<GrandeDiaDto> ConcluirItemAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento);

    Task<GrandeDiaDto> ReabrirItemAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento);
}
