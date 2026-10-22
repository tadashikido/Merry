using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Fornecedores;

namespace Casamento.Dominio.Cronogramas;

public static class GeradorItensCronograma
{
    public static IReadOnlyList<ItemModeloCronograma> ItensPendentes(
        IEnumerable<ItemModeloCronograma> itens,
        IReadOnlyCollection<Guid> origensJaAplicadas)
    {
        ArgumentNullException.ThrowIfNull(itens);
        ArgumentNullException.ThrowIfNull(origensJaAplicadas);

        var aplicadas = origensJaAplicadas.ToHashSet();
        return itens.Where(item => !aplicadas.Contains(item.Id)).ToList();
    }

    public static IReadOnlyDictionary<CategoriaFornecedor, Guid> VinculoUnicoPorCategoria(
        IEnumerable<(Guid VinculoId, CategoriaFornecedor Categoria)> vinculosAtivos)
    {
        ArgumentNullException.ThrowIfNull(vinculosAtivos);

        return vinculosAtivos
            .GroupBy(vinculo => vinculo.Categoria)
            .Where(grupo => grupo.Count() == 1)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Single().VinculoId);
    }

    public static Guid? FornecedorDoItem(
        ItemModeloCronograma item,
        IReadOnlyDictionary<CategoriaFornecedor, Guid> vinculoPorCategoria)
    {
        ArgumentNullException.ThrowIfNull(item);
        ArgumentNullException.ThrowIfNull(vinculoPorCategoria);

        return item.CategoriaFornecedor is { } categoria && vinculoPorCategoria.TryGetValue(categoria, out var vinculoId)
            ? vinculoId
            : null;
    }

    public static IReadOnlyList<ItemCronograma> Gerar(
        CasamentoAssessorado casamento,
        TimeOnly horarioCerimonia,
        IEnumerable<ItemModeloCronograma> itensPendentes,
        IReadOnlyDictionary<CategoriaFornecedor, Guid> vinculoPorCategoria,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(casamento);
        ArgumentNullException.ThrowIfNull(itensPendentes);
        ArgumentNullException.ThrowIfNull(vinculoPorCategoria);

        return itensPendentes
            .Select(item => ItemCronograma.CriarDeModelo(
                casamento.Id,
                item.ParaDadosItem(casamento, horarioCerimonia, FornecedorDoItem(item, vinculoPorCategoria)),
                item.Id,
                horarioCerimonia,
                criadoPorUsuarioId,
                agora))
            .ToList();
    }
}
