using Casamento.Dominio.Financeiro;

namespace Casamento.Aplicacao.Financeiro;

public static class NumeracaoParcelas
{
    public static IReadOnlyList<ParcelaFornecedor> Ordenar(IEnumerable<ParcelaFornecedor> parcelas)
    {
        ArgumentNullException.ThrowIfNull(parcelas);

        return parcelas
            .OrderBy(parcela => parcela.Vencimento)
            .ThenBy(parcela => parcela.CriadoEm)
            .ThenBy(parcela => parcela.Id)
            .ToList();
    }

    public static IReadOnlyDictionary<Guid, PosicaoParcela> Numerar(IEnumerable<ParcelaFornecedor> parcelas)
    {
        ArgumentNullException.ThrowIfNull(parcelas);

        var resultado = new Dictionary<Guid, PosicaoParcela>();

        foreach (var grupo in parcelas.GroupBy(parcela => parcela.FornecedorCasamentoId))
        {
            var ordenadas = Ordenar(grupo);

            for (var indice = 0; indice < ordenadas.Count; indice++)
            {
                resultado[ordenadas[indice].Id] = new PosicaoParcela(indice + 1, ordenadas.Count);
            }
        }

        return resultado;
    }
}
