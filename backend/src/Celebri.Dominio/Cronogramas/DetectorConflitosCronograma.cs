namespace Celebri.Dominio.Cronogramas;

public static class DetectorConflitosCronograma
{
    public static IReadOnlyDictionary<Guid, IReadOnlyList<ConflitoItem>> Detectar(IEnumerable<ItemCronograma> itens)
    {
        ArgumentNullException.ThrowIfNull(itens);

        var lista = itens.ToList();
        var conflitos = new Dictionary<Guid, List<ConflitoItem>>();

        for (var i = 0; i < lista.Count; i++)
        {
            for (var j = i + 1; j < lista.Count; j++)
            {
                var primeiro = lista[i];
                var segundo = lista[j];

                if (primeiro.Id == segundo.Id || !SeSobrepoem(primeiro, segundo))
                {
                    continue;
                }

                if (primeiro.ResponsavelChave is not null && primeiro.ResponsavelChave == segundo.ResponsavelChave)
                {
                    Registrar(conflitos, primeiro, segundo, MotivoConflito.Responsavel);
                }

                if (primeiro.FornecedorCasamentoId is not null && primeiro.FornecedorCasamentoId == segundo.FornecedorCasamentoId)
                {
                    Registrar(conflitos, primeiro, segundo, MotivoConflito.Fornecedor);
                }
            }
        }

        return conflitos.ToDictionary(par => par.Key, par => (IReadOnlyList<ConflitoItem>)par.Value);
    }

    public static bool SeSobrepoem(ItemCronograma primeiro, ItemCronograma segundo)
    {
        ArgumentNullException.ThrowIfNull(primeiro);
        ArgumentNullException.ThrowIfNull(segundo);

        var instantePrimeiro = primeiro.DuracaoMinutos is null;
        var instanteSegundo = segundo.DuracaoMinutos is null;

        if (instantePrimeiro && instanteSegundo)
        {
            return primeiro.MinutoInicial == segundo.MinutoInicial;
        }

        if (instantePrimeiro)
        {
            return Contem(segundo, primeiro.MinutoInicial);
        }

        if (instanteSegundo)
        {
            return Contem(primeiro, segundo.MinutoInicial);
        }

        return primeiro.MinutoInicial < segundo.MinutoFinal && segundo.MinutoInicial < primeiro.MinutoFinal;
    }

    private static bool Contem(ItemCronograma item, int minuto)
    {
        return item.MinutoInicial <= minuto && minuto < item.MinutoFinal;
    }

    private static void Registrar(
        Dictionary<Guid, List<ConflitoItem>> conflitos,
        ItemCronograma primeiro,
        ItemCronograma segundo,
        MotivoConflito motivo)
    {
        Adicionar(conflitos, primeiro.Id, new ConflitoItem(segundo.Id, motivo));
        Adicionar(conflitos, segundo.Id, new ConflitoItem(primeiro.Id, motivo));
    }

    private static void Adicionar(Dictionary<Guid, List<ConflitoItem>> conflitos, Guid itemId, ConflitoItem conflito)
    {
        if (!conflitos.TryGetValue(itemId, out var lista))
        {
            lista = [];
            conflitos[itemId] = lista;
        }

        lista.Add(conflito);
    }
}
