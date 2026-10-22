namespace Celebri.Aplicacao.Isolamento;

public interface IContextoIsolamento
{
    Guid? OrganizacaoId { get; }

    IReadOnlyCollection<Guid>? EventosPermitidos { get; }
}
