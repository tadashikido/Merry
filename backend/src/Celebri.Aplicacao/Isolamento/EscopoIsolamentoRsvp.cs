namespace Celebri.Aplicacao.Isolamento;

public sealed class EscopoIsolamentoRsvp
{
    public Guid? OrganizacaoId { get; private set; }

    public Guid? ConviteId { get; private set; }

    public void Estabelecer(Guid organizacaoId, Guid conviteId)
    {
        if (organizacaoId == Guid.Empty || conviteId == Guid.Empty)
        {
            throw new InvalidOperationException("O escopo RSVP exige organização e convite válidos.");
        }

        if (OrganizacaoId is not null)
        {
            throw new InvalidOperationException("O escopo RSVP já foi estabelecido nesta requisição.");
        }

        OrganizacaoId = organizacaoId;
        ConviteId = conviteId;
    }
}
