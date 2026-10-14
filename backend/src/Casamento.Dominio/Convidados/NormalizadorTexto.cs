using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Casamento.Dominio.Convidados;

public static partial class NormalizadorTexto
{
    public static string? Normalizar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        return EspacosRepetidos().Replace(valor.Trim(), " ");
    }

    public static string? ChaveComparacao(string? valor)
    {
        var normalizado = Normalizar(valor);

        if (normalizado is null)
        {
            return null;
        }

        var decomposto = normalizado.Normalize(NormalizationForm.FormD);
        var construtor = new StringBuilder(decomposto.Length);

        foreach (var caractere in decomposto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caractere) != UnicodeCategory.NonSpacingMark)
            {
                construtor.Append(caractere);
            }
        }

        return construtor.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspacosRepetidos();
}
