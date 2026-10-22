namespace Casamento.Aplicacao.Isolamento;

public sealed class EscopoIsolamentoSistema
{
    public Guid? OrganizacaoId { get; private set; }

    public void Assumir(Guid organizacaoId)
    {
        if (organizacaoId == Guid.Empty)
        {
            throw new InvalidOperationException("O escopo de sistema exige uma organização válida.");
        }

        if (OrganizacaoId is not null)
        {
            throw new InvalidOperationException("O escopo de sistema já foi assumido neste escopo de serviços.");
        }

        OrganizacaoId = organizacaoId;
    }
}
