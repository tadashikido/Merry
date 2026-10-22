namespace Celebri.Aplicacao.Auditoria;

public interface IAutorAlteracao
{
    Guid? UsuarioId { get; }

    string? Papel { get; }
}
