using System.Globalization;

namespace Casamento.Dominio.Financeiro;

public static class FormatacaoMoeda
{
    private static readonly CultureInfo Cultura = CultureInfo.GetCultureInfo("pt-BR");

    public static string Formatar(decimal valor)
    {
        return "R$ " + valor.ToString("N2", Cultura);
    }
}
