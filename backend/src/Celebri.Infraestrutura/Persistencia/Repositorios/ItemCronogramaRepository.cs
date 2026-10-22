using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ItemCronogramaRepository : IItemCronogramaRepository
{
    private readonly CasamentoDbContext _contexto;

    public ItemCronogramaRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<ItemCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.ItensCronograma
            .AsNoTracking()
            .Where(item => item.CasamentoId == casamentoId)
            .ToListAsync(cancelamento);
    }

    public Task<ItemCronograma?> ObterPorIdAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        return _contexto.ItensCronograma
            .FirstOrDefaultAsync(item => item.CasamentoId == casamentoId && item.Id == itemId, cancelamento);
    }

    public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return _contexto.ItensCronograma.CountAsync(item => item.CasamentoId == casamentoId, cancelamento);
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
