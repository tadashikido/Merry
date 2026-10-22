using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ItemCronogramaRepository : IItemCronogramaRepository
{
    private readonly CelebriDbContext _contexto;

    public ItemCronogramaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<ItemCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.ItensCronograma
            .AsNoTracking()
            .Where(item => item.EventoId == eventoId)
            .ToListAsync(cancelamento);
    }

    public Task<ItemCronograma?> ObterPorIdAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return _contexto.ItensCronograma
            .FirstOrDefaultAsync(item => item.EventoId == eventoId && item.Id == itemId, cancelamento);
    }

    public Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return _contexto.ItensCronograma.CountAsync(item => item.EventoId == eventoId, cancelamento);
    }

    public void Adicionar(ItemCronograma item)
    {
        _contexto.ItensCronograma.Add(item);
    }

    public void Remover(ItemCronograma item)
    {
        _contexto.ItensCronograma.Remove(item);
    }
}
