using System.Globalization;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public static class OrdenacaoConvites
{
    private static readonly CompareInfo ComparacaoPtBr = CultureInfo.GetCultureInfo("pt-BR").CompareInfo;

    private static readonly StringComparer ComparadorNome = ComparacaoPtBr.GetStringComparer(
        CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace);

    public static IReadOnlyList<Convite> Ordenar(IEnumerable<Convite> convites)
    {
        ArgumentNullException.ThrowIfNull(convites);

        return convites
            .OrderBy(convite => convite.Nome, ComparadorNome)
            .ThenBy(convite => convite.CriadoEm)
            .ThenBy(convite => convite.Id)
            .ToList();
    }
}
