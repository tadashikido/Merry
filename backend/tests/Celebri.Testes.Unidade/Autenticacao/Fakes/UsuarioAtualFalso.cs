using Celebri.Aplicacao.UsuarioAtual;

namespace Celebri.Testes.Unidade.Autenticacao.Fakes;

public sealed class UsuarioAtualFalso : IUsuarioAtual
{
    private UsuarioAtualFalso(bool autenticado, string? papel, Guid? organizacaoId, Guid? eventoId)
    {
        Autenticado = autenticado;
        Papel = papel;
        OrganizacaoId = organizacaoId;
        EventoId = eventoId;
        UsuarioId = autenticado ? Guid.NewGuid() : null;
    }

    public bool Autenticado { get; }

    public Guid? UsuarioId { get; }

    public Guid? OrganizacaoId { get; }

    public Guid? EventoId { get; }

    public string? Papel { get; }

    public static UsuarioAtualFalso Dono(Guid? organizacaoId = null)
    {
        return new UsuarioAtualFalso(true, "Dono", organizacaoId ?? Guid.NewGuid(), null);
    }

    public static UsuarioAtualFalso Anfitriao(Guid eventoId, Guid? organizacaoId = null)
    {
        return new UsuarioAtualFalso(true, "Anfitriao", organizacaoId ?? Guid.NewGuid(), eventoId);
    }

    public static UsuarioAtualFalso Anonimo()
    {
        return new UsuarioAtualFalso(false, null, null, null);
    }
}
