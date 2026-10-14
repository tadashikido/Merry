using Casamento.Dominio.Rsvp;

namespace Casamento.Aplicacao.Persistencia;

public interface IAcessoRsvpRepository
{
    Task<AcessoRsvp?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<AcessoRsvp?> ObterPorConviteAsync(Guid conviteId, CancellationToken cancelamento);

    void Adicionar(AcessoRsvp acesso);

    void Remover(AcessoRsvp acesso);
}
