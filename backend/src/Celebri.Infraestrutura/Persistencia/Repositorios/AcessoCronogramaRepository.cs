using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AcessoCronogramaRepository : IAcessoCronogramaRepository
{
    private readonly CelebriDbContext _contexto;

    public AcessoCronogramaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.AcessosCronograma.AsNoTracking().FirstOrDefaultAsync(acesso => acesso.TokenHash == tokenHash, cancelamento);
    }

    public async Task<IReadOnlyList<AcessoCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.AcessosCronograma
            .AsNoTracking()
            .Where(acesso => acesso.EventoId == eventoId)
            .ToListAsync(cancelamento);
    }

    public Task<AcessoCronograma?> ObterAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        return _contexto.AcessosCronograma
            .FirstOrDefaultAsync(acesso => acesso.EventoId == eventoId && acesso.Id == acessoId, cancelamento);
    }

    public void Adicionar(AcessoCronograma acesso)
    {
        _contexto.AcessosCronograma.Add(acesso);
    }

    public void Remover(AcessoCronograma acesso)
    {
        _contexto.AcessosCronograma.Remove(acesso);
    }
}
