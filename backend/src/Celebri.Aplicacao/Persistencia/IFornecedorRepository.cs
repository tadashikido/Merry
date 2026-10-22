using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public interface IFornecedorRepository
{
    Task<IReadOnlyList<Fornecedor>> ListarAsync(CancellationToken cancelamento);

    Task<Fornecedor?> ObterAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task<int> ContarAsync(CancellationToken cancelamento);

    Task<Fornecedor?> BuscarPorChaveAsync(
        CategoriaFornecedor categoria,
        string nomeNormalizado,
        Guid? ignorarFornecedorId,
        CancellationToken cancelamento);

    void Adicionar(Fornecedor fornecedor);

    void Remover(Fornecedor fornecedor);
}
