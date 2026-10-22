using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.UsuarioAtual;

public static class ExtensoesUsuarioAtual
{
    public static bool EhAssessoria(this IUsuarioAtual usuarioAtual)
    {
        ArgumentNullException.ThrowIfNull(usuarioAtual);
        return usuarioAtual.Autenticado && usuarioAtual.Papel == nameof(PapelUsuario.Dono);
    }

    public static bool EhCasal(this IUsuarioAtual usuarioAtual)
    {
        ArgumentNullException.ThrowIfNull(usuarioAtual);
        return usuarioAtual.Autenticado && usuarioAtual.Papel == nameof(PapelUsuario.Casal);
    }

    public static bool EhCasalDoCasamento(this IUsuarioAtual usuarioAtual, Guid casamentoId)
    {
        return usuarioAtual.EhCasal() && usuarioAtual.CasamentoId == casamentoId;
    }
}
