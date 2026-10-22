using Celebri.Aplicacao.Isolamento;

namespace Celebri.Testes.Integracao.Isolamento;

public class ContextoIsolamentoFixo : IContextoIsolamento
{
    public ContextoIsolamentoFixo(Guid? organizacaoId, IReadOnlyCollection<Guid>? casamentosPermitidos = null)
    {
        OrganizacaoId = organizacaoId;
        CasamentosPermitidos = casamentosPermitidos;
    }

    public Guid? OrganizacaoId { get; }

    public IReadOnlyCollection<Guid>? CasamentosPermitidos { get; }
}
