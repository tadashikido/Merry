using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.UsuarioAtual;

public static class ExtensoesUsuarioAtual
{
    public static bool EhAssessoria(this IUsuarioAtual usuarioAtual)
    {
        ArgumentNullException.ThrowIfNull(usuarioAtual);
        return usuarioAtual.Autenticado && usuarioAtual.Papel == nameof(PapelUsuario.Dono);
    }

    public static bool EhAnfitriao(this IUsuarioAtual usuarioAtual)
    {
        ArgumentNullException.ThrowIfNull(usuarioAtual);
        return usuarioAtual.Autenticado && usuarioAtual.Papel == nameof(PapelUsuario.Anfitriao);
    }

    public static bool EhAnfitriaoDoEvento(this IUsuarioAtual usuarioAtual, Guid eventoId)
    {
        return usuarioAtual.EhAnfitriao() && usuarioAtual.EventoId == eventoId;
    }
}
