using Casamento.Dominio.Cronogramas;

namespace Casamento.Aplicacao.Persistencia;

public interface IItemCronogramaRepository
{
    Task<IReadOnlyList<ItemCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<ItemCronograma?> ObterPorIdAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento);

    Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    void Adicionar(ItemCronograma item);

    void Remover(ItemCronograma item);
}
