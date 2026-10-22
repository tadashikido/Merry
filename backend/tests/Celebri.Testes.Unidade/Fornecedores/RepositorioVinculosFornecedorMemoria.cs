using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Fornecedores;

public sealed class RepositorioVinculosFornecedorMemoria : IFornecedorCasamentoRepository
{
    public List<FornecedorCasamento> Itens { get; } = [];

    public Dictionary<Guid, Fornecedor> Fornecedores { get; } = [];

    public int MarcacoesAlteracao { get; private set; }

    public Task<IReadOnlyList<VinculoFornecedor>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        IReadOnlyList<VinculoFornecedor> resultado = Itens
            .Where(item => item.CasamentoId == casamentoId)
            .Select(item => new VinculoFornecedor(item, Fornecedores[item.FornecedorId]))
            .ToList();
        return Task.FromResult(resultado);
    }

    public Task<VinculoFornecedor?> ObterAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var vinculo = Itens.FirstOrDefault(item => item.CasamentoId == casamentoId && item.Id == vinculoId);
        return Task.FromResult(vinculo is null ? null : new VinculoFornecedor(vinculo, Fornecedores[vinculo.FornecedorId]));
    }

    public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Count(item => item.CasamentoId == casamentoId));
    }

    public Task<IReadOnlyList<Guid>> ListarFornecedoresVinculadosAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        IReadOnlyList<Guid> resultado = Itens.Where(item => item.CasamentoId == casamentoId).Select(item => item.FornecedorId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<bool> ExisteParaFornecedorAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Exists(item => item.FornecedorId == fornecedorId));
    }

    public Task<IReadOnlyList<ParticipacaoFornecedor>> ListarParticipacoesAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        IReadOnlyList<ParticipacaoFornecedor> resultado = [];
        return Task.FromResult(resultado);
    }

    public void Adicionar(FornecedorCasamento vinculo)
    {
        Itens.Add(vinculo);
    }

    public void Remover(FornecedorCasamento vinculo)
    {
        Itens.Remove(vinculo);
    }

    public void MarcarAlterado(FornecedorCasamento vinculo)
    {
        MarcacoesAlteracao++;
    }
}
