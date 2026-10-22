using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public interface IFornecedorEventoRepository
{
    Task<IReadOnlyList<VinculoFornecedor>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<VinculoFornecedor?> ObterAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<IReadOnlyList<Guid>> ListarFornecedoresVinculadosAsync(Guid eventoId, CancellationToken cancelamento);

    Task<bool> ExisteParaFornecedorAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParticipacaoFornecedor>> ListarParticipacoesAsync(Guid fornecedorId, CancellationToken cancelamento);

    void Adicionar(FornecedorEvento vinculo);

    void Remover(FornecedorEvento vinculo);

    void MarcarAlterado(FornecedorEvento vinculo);
}
