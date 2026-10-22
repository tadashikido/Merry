namespace Celebri.Aplicacao.CronogramaPublico;

public interface ILinkCronogramaService
{
    Task<LinksCronogramaDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<LinkCronogramaDto> GerarAsync(Guid casamentoId, GerarLinkCronogramaRequest request, CancellationToken cancelamento);

    Task<LinkCronogramaDto> RegenerarAsync(Guid casamentoId, Guid linkId, CancellationToken cancelamento);

    Task RevogarAsync(Guid casamentoId, Guid linkId, CancellationToken cancelamento);
}
