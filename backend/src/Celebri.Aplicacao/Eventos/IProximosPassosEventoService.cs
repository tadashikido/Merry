namespace Celebri.Aplicacao.Eventos;

public interface IProximosPassosEventoService
{
    Task<ProximosPassosEventoDto> ObterAsync(Guid eventoId, CancellationToken cancelamento);
}
