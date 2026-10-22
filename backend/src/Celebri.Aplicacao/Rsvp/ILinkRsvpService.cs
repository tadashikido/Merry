using Celebri.Aplicacao.Convidados;

namespace Celebri.Aplicacao.Rsvp;

public interface ILinkRsvpService
{
    Task<LinkRsvpDto> ObterAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);

    Task<LinkRsvpDto> GerarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);

    Task<LinkRsvpDto> RegenerarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);

    Task RevogarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);

    Task<ConviteDto> MarcarEnviadoAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);
}
