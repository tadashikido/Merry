namespace Celebri.Aplicacao.Eventos;

public interface IDuplicacaoEventoService
{
    Task<PreviaDuplicacaoDto> PreverAsync(Guid eventoOrigemId, DateOnly? novaData, CancellationToken cancelamento);

    Task<DuplicacaoEventoDto> DuplicarAsync(Guid eventoOrigemId, DuplicarEventoRequest request, CancellationToken cancelamento);
}
