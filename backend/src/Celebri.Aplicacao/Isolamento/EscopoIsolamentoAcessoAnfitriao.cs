namespace Celebri.Aplicacao.Isolamento;

public sealed class EscopoIsolamentoAcessoAnfitriao
{
    public Guid? OrganizacaoId { get; private set; }

    public Guid? EventoId { get; private set; }

    public void Fixar(Guid organizacaoId, Guid eventoId)
    {
        if (organizacaoId == Guid.Empty || eventoId == Guid.Empty)
        {
            throw new InvalidOperationException("O escopo do convite dos anfitriões exige organização e evento válidos.");
        }

        if (OrganizacaoId is not null)
        {
            throw new InvalidOperationException("O escopo do convite dos anfitriões já foi estabelecido nesta requisição.");
        }

        OrganizacaoId = organizacaoId;
        EventoId = eventoId;
    }
}
