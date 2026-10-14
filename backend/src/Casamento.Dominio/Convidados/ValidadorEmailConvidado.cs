using System.Text.RegularExpressions;

namespace Casamento.Dominio.Convidados;

public static partial class ValidadorEmailConvidado
{
    public const int TamanhoMaximo = 254;
    public const string Padrao = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";

    public static bool Valido(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return true;
        }

        var normalizado = email.Trim();
        return normalizado.Length <= TamanhoMaximo && FormatoEmail().IsMatch(normalizado);
    }

    [GeneratedRegex(Padrao)]
    private static partial Regex FormatoEmail();
}
