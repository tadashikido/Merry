using Celebri.Aplicacao.Isolamento;

namespace Celebri.Testes.Integracao.Isolamento;

public class ContextoIsolamentoFixo : IContextoIsolamento
{
    public ContextoIsolamentoFixo(Guid? organizacaoId, IReadOnlyCollection<Guid>? eventosPermitidos = null)
    {
        OrganizacaoId = organizacaoId;
        EventosPermitidos = eventosPermitidos;
    }

    public Guid? OrganizacaoId { get; }

    public IReadOnlyCollection<Guid>? EventosPermitidos { get; }
}
