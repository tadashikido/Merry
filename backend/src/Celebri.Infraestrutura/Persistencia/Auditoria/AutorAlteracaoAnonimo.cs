using Celebri.Aplicacao.Auditoria;

namespace Celebri.Infraestrutura.Persistencia.Auditoria;

public class AutorAlteracaoAnonimo : IAutorAlteracao
{
    public Guid? UsuarioId => null;

    public string? Papel => null;
}
