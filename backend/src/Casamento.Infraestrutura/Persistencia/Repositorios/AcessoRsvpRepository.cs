using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Rsvp;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class AcessoRsvpRepository : IAcessoRsvpRepository
{
    private readonly CasamentoDbContext _contexto;

    public AcessoRsvpRepository(CasamentoDbContext contexto)
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

    public void Adicionar(AcessoRsvp acesso)
    {
        _contexto.AcessosRsvp.Add(acesso);
    }

    public void Remover(AcessoRsvp acesso)
    {
        _contexto.AcessosRsvp.Remove(acesso);
    }
}
