using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Fornecedores;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class FornecedorCasamentoRepository : IFornecedorCasamentoRepository
{
    private readonly CasamentoDbContext _contexto;

    public FornecedorCasamentoRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<VinculoFornecedor>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.FornecedoresCasamento
            .AsNoTracking()
            .Where(vinculo => vinculo.CasamentoId == casamentoId)
            .Join(
                _contexto.Fornecedores.AsNoTracking(),
                vinculo => vinculo.FornecedorId,
                fornecedor => fornecedor.Id,
                (vinculo, fornecedor) => new VinculoFornecedor(vinculo, fornecedor))
            .ToListAsync(cancelamento);
    }

    public Task<VinculoFornecedor?> ObterAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        return _contexto.FornecedoresCasamento
            .Where(vinculo => vinculo.CasamentoId == casamentoId && vinculo.Id == vinculoId)
            .Join(
                _contexto.Fornecedores,
                vinculo => vinculo.FornecedorId,
                fornecedor => fornecedor.Id,
                (vinculo, fornecedor) => new VinculoFornecedor(vinculo, fornecedor))
            .FirstOrDefaultAsync(cancelamento);
    }

    public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return _contexto.FornecedoresCasamento.CountAsync(vinculo => vinculo.CasamentoId == casamentoId, cancelamento);
    }

    public async Task<IReadOnlyList<Guid>> ListarFornecedoresVinculadosAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.FornecedoresCasamento
            .AsNoTracking()
            .Where(vinculo => vinculo.CasamentoId == casamentoId)
            .Select(vinculo => vinculo.FornecedorId)
            .ToListAsync(cancelamento);
    }

    public Task<bool> ExisteParaFornecedorAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return _contexto.FornecedoresCasamento.AnyAsync(vinculo => vinculo.FornecedorId == fornecedorId, cancelamento);
    }

    public async Task<IReadOnlyList<ParticipacaoFornecedor>> ListarParticipacoesAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return await _contexto.FornecedoresCasamento
            .AsNoTracking()
            .Where(vinculo => vinculo.FornecedorId == fornecedorId)
            .Join(
                _contexto.Casamentos.AsNoTracking(),
                vinculo => vinculo.CasamentoId,
                casamento => casamento.Id,
                (vinculo, casamento) => new ParticipacaoFornecedor(
                    casamento.Id,
                    casamento.NomePrimeiraPessoa,
                    casamento.NomeSegundaPessoa,
                    casamento.Data,
                    casamento.ArquivadoEm != null,
                    vinculo.Status))
            .ToListAsync(cancelamento);
    }

    public void Adicionar(FornecedorCasamento vinculo)
    {
        _contexto.FornecedoresCasamento.Add(vinculo);
    }

    public void Remover(FornecedorCasamento vinculo)
    {
        _contexto.FornecedoresCasamento.Remove(vinculo);
    }

    public void MarcarAlterado(FornecedorCasamento vinculo)
    {
        _contexto.Entry(vinculo).Property(item => item.AtualizadoEm).IsModified = true;
    }
}
