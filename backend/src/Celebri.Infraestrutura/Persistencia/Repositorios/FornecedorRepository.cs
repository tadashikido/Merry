using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Fornecedores;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class FornecedorRepository : IFornecedorRepository
{
    private readonly CasamentoDbContext _contexto;

    public FornecedorRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Fornecedor>> ListarAsync(CancellationToken cancelamento)
    {
        return await _contexto.Fornecedores
            .AsNoTracking()
            .ToListAsync(cancelamento);
    }

    public Task<Fornecedor?> ObterAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return _contexto.Fornecedores.FirstOrDefaultAsync(fornecedor => fornecedor.Id == fornecedorId, cancelamento);
    }

    public Task<int> ContarAsync(CancellationToken cancelamento)
    {
        return _contexto.Fornecedores.CountAsync(cancelamento);
    }

    public Task<Fornecedor?> BuscarPorChaveAsync(
        CategoriaFornecedor categoria,
        string nomeNormalizado,
        Guid? ignorarFornecedorId,
        CancellationToken cancelamento)
    {
        return _contexto.Fornecedores
            .AsNoTracking()
            .FirstOrDefaultAsync(
                fornecedor => fornecedor.Categoria == categoria
                    && fornecedor.NomeNormalizado == nomeNormalizado
                    && (ignorarFornecedorId == null || fornecedor.Id != ignorarFornecedorId),
                cancelamento);
    }

    public void Adicionar(Fornecedor fornecedor)
    {
        _contexto.Fornecedores.Add(fornecedor);
    }

    public void Remover(Fornecedor fornecedor)
    {
        _contexto.Fornecedores.Remove(fornecedor);
    }
}
