using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Rsvp;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AcessoRsvpRepository : IAcessoRsvpRepository
{
    private readonly CelebriDbContext _contexto;

    public AcessoRsvpRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<AcessoRsvp?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.AcessosRsvp.AsNoTracking().FirstOrDefaultAsync(acesso => acesso.TokenHash == tokenHash, cancelamento);
    }

    public Task<AcessoRsvp?> ObterPorConviteAsync(Guid conviteId, CancellationToken cancelamento)
    {
        return _contexto.AcessosRsvp.FirstOrDefaultAsync(acesso => acesso.ConviteId == conviteId, cancelamento);
    }

    public async Task<IReadOnlySet<Guid>> ListarConvitesComLinkAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var identificadores = await _contexto.AcessosRsvp
            .AsNoTracking()
            .Where(acesso => acesso.EventoId == eventoId)
            .Select(acesso => acesso.ConviteId)
            .ToListAsync(cancelamento);

        return identificadores.ToHashSet();
    }

    public void Adicionar(AcessoRsvp acesso)
    {
        _contexto.AcessosRsvp.Add(acesso);
    }

    public void Remover(AcessoRsvp acesso)
    {
        _contexto.AcessosRsvp.Remove(acesso);
    }
}
