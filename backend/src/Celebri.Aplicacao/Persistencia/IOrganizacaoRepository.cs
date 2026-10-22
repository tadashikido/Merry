using Celebri.Dominio.Organizacoes;

namespace Celebri.Aplicacao.Persistencia;

public interface IOrganizacaoRepository
{
    Task<Organizacao?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    Task<IReadOnlyList<Guid>> ListarIdsAsync(CancellationToken cancelamento);

    void Adicionar(Organizacao organizacao);
}
