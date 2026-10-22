using Casamento.Aplicacao.Isolamento;

namespace Casamento.Infraestrutura.Persistencia.Isolamento;

public class ContextoIsolamentoSemOrganizacao : IContextoIsolamento
{
    public Guid? OrganizacaoId => null;

    public IReadOnlyCollection<Guid>? CasamentosPermitidos => [];
}
