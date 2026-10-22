namespace Celebri.Dominio.Eventos;

public static class RegrasTipoEvento
{
    public static readonly IReadOnlyList<TipoEvento> Disponiveis =
    [
        TipoEvento.Casamento,
        TipoEvento.QuinzeAnos,
        TipoEvento.Aniversario,
        TipoEvento.Comemoracao,
    ];

    public static bool EhDisponivel(TipoEvento tipo)
    {
        return Disponiveis.Contains(tipo);
    }

    public static bool ExigeSegundoNome(TipoEvento tipo)
    {
        return tipo == TipoEvento.Casamento;
    }

    public static bool AceitaSegundoNome(TipoEvento tipo)
    {
        return tipo is TipoEvento.Casamento or TipoEvento.Comemoracao;
    }
}
