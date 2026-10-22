namespace Celebri.Aplicacao.UsuarioAtual;

public interface IUsuarioAtual
{
    bool Autenticado { get; }

    Guid? UsuarioId { get; }

    Guid? OrganizacaoId { get; }

    Guid? CasamentoId { get; }

    string? Papel { get; }
}
