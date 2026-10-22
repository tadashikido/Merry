namespace Celebri.Aplicacao.CronogramaPublico;

public interface ILinkCronogramaService
{
    Task<LinksCronogramaDto> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<LinkCronogramaDto> GerarAsync(Guid eventoId, GerarLinkCronogramaRequest request, CancellationToken cancelamento);

    Task<LinkCronogramaDto> RegenerarAsync(Guid eventoId, Guid linkId, CancellationToken cancelamento);

    Task RevogarAsync(Guid eventoId, Guid linkId, CancellationToken cancelamento);
}
