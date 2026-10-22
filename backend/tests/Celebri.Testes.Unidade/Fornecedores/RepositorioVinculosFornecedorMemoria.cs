using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Fornecedores;

public sealed class RepositorioVinculosFornecedorMemoria : IFornecedorEventoRepository
{
    public List<FornecedorEvento> Itens { get; } = [];

    public Dictionary<Guid, Fornecedor> Fornecedores { get; } = [];

    public int MarcacoesAlteracao { get; private set; }

    public Task<IReadOnlyList<VinculoFornecedor>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        IReadOnlyList<VinculoFornecedor> resultado = Itens
            .Where(item => item.EventoId == eventoId)
            .Select(item => new VinculoFornecedor(item, Fornecedores[item.FornecedorId]))
            .ToList();
        return Task.FromResult(resultado);
    }

    public Task<VinculoFornecedor?> ObterAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var vinculo = Itens.FirstOrDefault(item => item.EventoId == eventoId && item.Id == vinculoId);
        return Task.FromResult(vinculo is null ? null : new VinculoFornecedor(vinculo, Fornecedores[vinculo.FornecedorId]));
    }

    public Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Count(item => item.EventoId == eventoId));
    }

    public Task<IReadOnlyList<Guid>> ListarFornecedoresVinculadosAsync(Guid eventoId, CancellationToken cancelamento)
    {
        IReadOnlyList<Guid> resultado = Itens.Where(item => item.EventoId == eventoId).Select(item => item.FornecedorId).ToList();
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

    public void Adicionar(FornecedorEvento vinculo)
    {
        Itens.Add(vinculo);
    }

    public void Remover(FornecedorEvento vinculo)
    {
        Itens.Remove(vinculo);
    }

    public void MarcarAlterado(FornecedorEvento vinculo)
    {
        MarcacoesAlteracao++;
    }
}
