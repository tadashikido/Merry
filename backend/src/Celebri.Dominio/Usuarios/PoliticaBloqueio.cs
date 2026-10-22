namespace Celebri.Dominio.Usuarios;

public static class PoliticaBloqueio
{
    public const int FalhasPermitidas = 5;

    public static readonly TimeSpan DuracaoBloqueio = TimeSpan.FromMinutes(15);
}
