using Celebri.Aplicacao.Isolamento;

namespace Celebri.Infraestrutura.Persistencia.Isolamento;

public class ContextoIsolamentoSemOrganizacao : IContextoIsolamento
{
    public Guid? OrganizacaoId => null;

    public IReadOnlyCollection<Guid>? CasamentosPermitidos => [];
}
