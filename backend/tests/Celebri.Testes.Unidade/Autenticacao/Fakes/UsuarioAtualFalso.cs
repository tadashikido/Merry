using Celebri.Aplicacao.UsuarioAtual;

namespace Celebri.Testes.Unidade.Autenticacao.Fakes;

public sealed class UsuarioAtualFalso : IUsuarioAtual
{
    private UsuarioAtualFalso(bool autenticado, string? papel, Guid? organizacaoId, Guid? casamentoId)
    {
        Autenticado = autenticado;
        Papel = papel;
        OrganizacaoId = organizacaoId;
        CasamentoId = casamentoId;
        UsuarioId = autenticado ? Guid.NewGuid() : null;
    }

    public bool Autenticado { get; }

    public Guid? UsuarioId { get; }

    public Guid? OrganizacaoId { get; }

    public Guid? CasamentoId { get; }

    public string? Papel { get; }

    public static UsuarioAtualFalso Dono(Guid? organizacaoId = null)
    {
        return new UsuarioAtualFalso(true, "Dono", organizacaoId ?? Guid.NewGuid(), null);
    }

    public static UsuarioAtualFalso Casal(Guid casamentoId, Guid? organizacaoId = null)
    {
        return new UsuarioAtualFalso(true, "Casal", organizacaoId ?? Guid.NewGuid(), casamentoId);
    }

    public static UsuarioAtualFalso Anonimo()
    {
        return new UsuarioAtualFalso(false, null, null, null);
    }
}
