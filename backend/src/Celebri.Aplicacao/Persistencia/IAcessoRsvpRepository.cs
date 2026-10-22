using Celebri.Dominio.Rsvp;

namespace Celebri.Aplicacao.Persistencia;

public interface IAcessoRsvpRepository
{
    Task<AcessoRsvp?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<AcessoRsvp?> ObterPorConviteAsync(Guid conviteId, CancellationToken cancelamento);

    Task<IReadOnlySet<Guid>> ListarConvitesComLinkAsync(Guid eventoId, CancellationToken cancelamento);

    void Adicionar(AcessoRsvp acesso);

    void Remover(AcessoRsvp acesso);
}
