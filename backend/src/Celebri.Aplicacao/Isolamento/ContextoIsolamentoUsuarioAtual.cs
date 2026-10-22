using Celebri.Aplicacao.UsuarioAtual;

namespace Celebri.Aplicacao.Isolamento;

public class ContextoIsolamentoUsuarioAtual : IContextoIsolamento
{
    private readonly IUsuarioAtual _usuarioAtual;

    public ContextoIsolamentoUsuarioAtual(IUsuarioAtual usuarioAtual)
    {
        _usuarioAtual = usuarioAtual;
    }

    public Guid? OrganizacaoId => _usuarioAtual.Autenticado ? _usuarioAtual.OrganizacaoId : null;

    public IReadOnlyCollection<Guid>? EventosPermitidos
    {
        get
        {
            if (!_usuarioAtual.Autenticado || _usuarioAtual.EhAssessoria())
            {
                return null;
            }

            return _usuarioAtual.EhAnfitriao() && _usuarioAtual.EventoId is { } eventoId && eventoId != Guid.Empty
                ? [eventoId]
                : [];
        }
    }
}
