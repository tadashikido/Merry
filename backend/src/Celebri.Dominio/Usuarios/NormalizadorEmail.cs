namespace Celebri.Dominio.Usuarios;

public static class NormalizadorEmail
{
    public const int TamanhoMaximo = 254;

    public static string Normalizar(string? email)
    {
        return (email ?? string.Empty).Trim().ToLowerInvariant();
    }
}
