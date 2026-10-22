namespace Celebri.Dominio.Isolamento;

public interface IPertenceEvento : IPertenceOrganizacao
{
    Guid EventoId { get; }
}
