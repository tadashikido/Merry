using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Fornecedores;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class FornecedorEventoRepository : IFornecedorEventoRepository
{
    private readonly CelebriDbContext _contexto;

    public FornecedorEventoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<VinculoFornecedor>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.FornecedoresEvento
            .AsNoTracking()
            .Where(vinculo => vinculo.EventoId == eventoId)
            .Join(
                _contexto.Fornecedores.AsNoTracking(),
                vinculo => vinculo.FornecedorId,
                fornecedor => fornecedor.Id,
                (vinculo, fornecedor) => new VinculoFornecedor(vinculo, fornecedor))
            .ToListAsync(cancelamento);
    }

    public Task<VinculoFornecedor?> ObterAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        return _contexto.FornecedoresEvento
            .Where(vinculo => vinculo.EventoId == eventoId && vinculo.Id == vinculoId)
            .Join(
                _contexto.Fornecedores,
                vinculo => vinculo.FornecedorId,
                fornecedor => fornecedor.Id,
                (vinculo, fornecedor) => new VinculoFornecedor(vinculo, fornecedor))
            .FirstOrDefaultAsync(cancelamento);
    }

    public Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return _contexto.FornecedoresEvento.CountAsync(vinculo => vinculo.EventoId == eventoId, cancelamento);
    }

    public async Task<IReadOnlyList<Guid>> ListarFornecedoresVinculadosAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.FornecedoresEvento
            .AsNoTracking()
            .Where(vinculo => vinculo.EventoId == eventoId)
            .Select(vinculo => vinculo.FornecedorId)
            .ToListAsync(cancelamento);
    }

    public Task<bool> ExisteParaFornecedorAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return _contexto.FornecedoresEvento.AnyAsync(vinculo => vinculo.FornecedorId == fornecedorId, cancelamento);
    }

    public async Task<IReadOnlyList<ParticipacaoFornecedor>> ListarParticipacoesAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return await _contexto.FornecedoresEvento
            .AsNoTracking()
            .Where(vinculo => vinculo.FornecedorId == fornecedorId)
            .Join(
                _contexto.Eventos.AsNoTracking(),
                vinculo => vinculo.EventoId,
                evento => evento.Id,
                (vinculo, evento) => new ParticipacaoFornecedor(
                    evento.Id,
                    evento.NomePrimeiraPessoa,
                    evento.NomeSegundaPessoa,
                    evento.Data,
                    evento.ArquivadoEm != null,
                    vinculo.Status))
            .ToListAsync(cancelamento);
    }

    public void Adicionar(FornecedorEvento vinculo)
    {
        _contexto.FornecedoresEvento.Add(vinculo);
    }

    public void Remover(FornecedorEvento vinculo)
    {
        _contexto.FornecedoresEvento.Remove(vinculo);
    }

    public void MarcarAlterado(FornecedorEvento vinculo)
    {
        _contexto.Entry(vinculo).Property(item => item.AtualizadoEm).IsModified = true;
    }
}
