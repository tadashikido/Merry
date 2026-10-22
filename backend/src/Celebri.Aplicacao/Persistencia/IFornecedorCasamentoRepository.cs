using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public interface IFornecedorCasamentoRepository
{
    Task<IReadOnlyList<VinculoFornecedor>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<VinculoFornecedor?> ObterAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<IReadOnlyList<Guid>> ListarFornecedoresVinculadosAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<bool> ExisteParaFornecedorAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParticipacaoFornecedor>> ListarParticipacoesAsync(Guid fornecedorId, CancellationToken cancelamento);

    void Adicionar(FornecedorCasamento vinculo);

    void Remover(FornecedorCasamento vinculo);

    void MarcarAlterado(FornecedorCasamento vinculo);
}
