namespace Celebri.Aplicacao.CronogramaPublico;

public static class FormatoTokenCronograma
{
    public const int Tamanho = 43;
    public const int TamanhoMaximoEntrada = 64;

    public static bool Valido(string? token)
    {
        return token is { Length: Tamanho } && token.All(CaractereValido);
    }

    private static bool CaractereValido(char caractere)
    {
        return char.IsAsciiLetterOrDigit(caractere) || caractere is '-' or '_';
    }
}
