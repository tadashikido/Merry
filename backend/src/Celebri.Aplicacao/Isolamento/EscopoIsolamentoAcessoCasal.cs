namespace Celebri.Aplicacao.Isolamento;

public sealed class EscopoIsolamentoAcessoCasal
{
    public Guid? OrganizacaoId { get; private set; }

    public Guid? CasamentoId { get; private set; }

    public void Fixar(Guid organizacaoId, Guid casamentoId)
    {
        if (organizacaoId == Guid.Empty || casamentoId == Guid.Empty)
        {
            throw new InvalidOperationException("O escopo do convite do casal exige organização e casamento válidos.");
        }

        if (OrganizacaoId is not null)
        {
            throw new InvalidOperationException("O escopo do convite do casal já foi estabelecido nesta requisição.");
        }

        OrganizacaoId = organizacaoId;
        CasamentoId = casamentoId;
    }
}
