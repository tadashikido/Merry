namespace Celebri.Dominio.Isolamento;

public interface IPertenceCasamento : IPertenceOrganizacao
{
    Guid CasamentoId { get; }
}
