using Celebri.Aplicacao.Convidados;

namespace Celebri.Aplicacao.Rsvp;

public interface ILinkRsvpService
{
    Task<LinkRsvpDto> ObterAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);

    Task<LinkRsvpDto> GerarAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);

    Task<LinkRsvpDto> RegenerarAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);

    Task RevogarAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);

    Task<ConviteDto> MarcarEnviadoAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);
}
