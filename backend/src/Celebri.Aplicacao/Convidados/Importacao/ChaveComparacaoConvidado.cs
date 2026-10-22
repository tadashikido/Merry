using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados.Importacao;

public static class ChaveComparacaoConvidado
{
    private const string CodigoBrasil = "55";

    public static string? Texto(string? valor)
    {
        return NormalizadorTexto.ChaveComparacao(valor);
    }

    public static string? Telefone(string? telefone)
    {
        if (!NormalizadorTelefone.TentarNormalizar(telefone, out var normalizado) || normalizado is null)
        {
            return null;
        }

        var digitos = normalizado.TrimStart('+');

        if (digitos.StartsWith(CodigoBrasil, StringComparison.Ordinal) && digitos.Length is 12 or 13)
        {
            return digitos[CodigoBrasil.Length..];
        }

        return digitos;
    }

    public static string Cabecalho(string? valor)
    {
        var texto = Texto(valor) ?? string.Empty;
        return new string(texto.Where(char.IsLetterOrDigit).ToArray());
    }
}
