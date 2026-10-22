namespace Casamento.Aplicacao.Isolamento;

public interface IContextoIsolamento
{
    Guid? OrganizacaoId { get; }

    IReadOnlyCollection<Guid>? CasamentosPermitidos { get; }
}
