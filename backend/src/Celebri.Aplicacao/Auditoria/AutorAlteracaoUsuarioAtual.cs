using Celebri.Aplicacao.UsuarioAtual;

namespace Celebri.Aplicacao.Auditoria;

public class AutorAlteracaoUsuarioAtual : IAutorAlteracao
{
    private readonly IUsuarioAtual _usuarioAtual;

    public AutorAlteracaoUsuarioAtual(IUsuarioAtual usuarioAtual)
    {
        _usuarioAtual = usuarioAtual;
    }

    public Guid? UsuarioId => _usuarioAtual.Autenticado ? _usuarioAtual.UsuarioId : null;

    public string? Papel => _usuarioAtual.Autenticado ? _usuarioAtual.Papel : null;
}
