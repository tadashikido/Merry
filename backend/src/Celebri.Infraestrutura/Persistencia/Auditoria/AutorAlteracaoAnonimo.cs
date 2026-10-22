using Casamento.Aplicacao.Auditoria;

namespace Casamento.Infraestrutura.Persistencia.Auditoria;

public class AutorAlteracaoAnonimo : IAutorAlteracao
{
    public Guid? UsuarioId => null;

    public string? Papel => null;
}
