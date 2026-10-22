namespace Casamento.Aplicacao.GrandeDia;

public interface IGrandeDiaService
{
    Task<GrandeDiaDto> ConsultarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<GrandeDiaDto> ConcluirItemAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento);

    Task<GrandeDiaDto> ReabrirItemAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento);
}
