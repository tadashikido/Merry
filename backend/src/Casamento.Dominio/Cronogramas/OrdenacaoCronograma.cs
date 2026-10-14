namespace Casamento.Dominio.Cronogramas;

public static class OrdenacaoCronograma
{
    public static IReadOnlyList<ItemCronograma> Ordenar(IEnumerable<ItemCronograma> itens)
    {
        ArgumentNullException.ThrowIfNull(itens);

        return itens
            .OrderBy(item => item.MinutoInicial)
            .ThenBy(item => item.DuracaoMinutos.HasValue)
            .ThenBy(item => item.DuracaoMinutos ?? 0)
            .ThenBy(item => item.Atividade, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Id)
            .ToList();
    }
}
