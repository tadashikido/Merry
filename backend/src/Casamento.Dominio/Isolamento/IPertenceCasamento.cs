namespace Casamento.Dominio.Isolamento;

public interface IPertenceCasamento : IPertenceOrganizacao
{
    Guid CasamentoId { get; }
}
