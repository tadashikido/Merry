using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.Persistencia;

public interface IItemCronogramaRepository
{
    Task<IReadOnlyList<ItemCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<ItemCronograma?> ObterPorIdAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento);

    Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    void Adicionar(ItemCronograma item);

    void Remover(ItemCronograma item);
}
