namespace Celebri.Aplicacao.Isolamento;

public sealed class EscopoIsolamentoCronogramaPublico
{
    public Guid? OrganizacaoId { get; private set; }

    public Guid? CasamentoId { get; private set; }

    public void Restringir(Guid organizacaoId, Guid casamentoId)
    {
        if (organizacaoId == Guid.Empty || casamentoId == Guid.Empty)
        {
            throw new InvalidOperationException("O escopo do cronograma público exige organização e casamento válidos.");
        }

        if (OrganizacaoId is not null)
        {
            throw new InvalidOperationException("O escopo do cronograma público já foi estabelecido nesta requisição.");
        }

        OrganizacaoId = organizacaoId;
        CasamentoId = casamentoId;
    }
}
