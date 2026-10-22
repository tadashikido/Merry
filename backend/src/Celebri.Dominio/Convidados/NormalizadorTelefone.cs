namespace Casamento.Dominio.Convidados;

public static class NormalizadorTelefone
{
    public const int DigitosMinimos = 10;
    public const int DigitosMaximos = 15;
    public const int TamanhoMaximoArmazenado = DigitosMaximos + 1;
    public const int TamanhoMaximoEntrada = 30;

    private const string CaracteresFormatacao = " ()-.";

    public static bool TentarNormalizar(string? telefone, out string? normalizado)
    {
        normalizado = null;

        if (string.IsNullOrWhiteSpace(telefone))
        {
            return true;
        }

        var texto = telefone.Trim();

        if (texto.Length > TamanhoMaximoEntrada)
        {
            return false;
        }

        var internacional = texto[0] == '+';
        var corpo = internacional ? texto[1..] : texto;

        if (corpo.Any(caractere => !char.IsAsciiDigit(caractere) && !CaracteresFormatacao.Contains(caractere, StringComparison.Ordinal)))
        {
            return false;
        }

        var digitos = new string(corpo.Where(char.IsAsciiDigit).ToArray());

        if (digitos.Length is < DigitosMinimos or > DigitosMaximos)
        {
            return false;
        }

        normalizado = internacional ? $"+{digitos}" : digitos;
        return true;
    }

    public static bool Valido(string? telefone)
    {
        return TentarNormalizar(telefone, out _);
    }
}
