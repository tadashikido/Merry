using Celebri.Aplicacao.Checklists;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Checklists;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ModeloChecklistRepository : IModeloChecklistRepository
{
    private readonly CasamentoDbContext _contexto;

    public ModeloChecklistRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<ModeloChecklistResumo>> ListarAsync(CancellationToken cancelamento)
    {
        return await _contexto.ModelosChecklist
            .AsNoTracking()
            .Select(modelo => new ModeloChecklistResumo(
                modelo.Id,
                modelo.Nome,
                modelo.Descricao,
                modelo.Sugerido,
                _contexto.ItensModeloChecklist.Count(item => item.ModeloId == modelo.Id),
                modelo.AtualizadoEm))
            .ToListAsync(cancelamento);
    }

    public Task<ModeloChecklist?> ObterComItensAsync(Guid modeloId, CancellationToken cancelamento)
    {
        return _contexto.ModelosChecklist
            .Include(modelo => modelo.Itens)
            .FirstOrDefaultAsync(modelo => modelo.Id == modeloId, cancelamento);
    }

    public Task<int> ContarAsync(CancellationToken cancelamento)
    {
        return _contexto.ModelosChecklist.CountAsync(cancelamento);
    }

    public Task<bool> ExisteNomeAsync(string nome, Guid? ignorarModeloId, CancellationToken cancelamento)
    {
        var nomeMinusculo = nome.ToLower();

        return _contexto.ModelosChecklist.AnyAsync(
            modelo => modelo.Nome.ToLower() == nomeMinusculo && (ignorarModeloId == null || modelo.Id != ignorarModeloId),
            cancelamento);
    }

    public void Adicionar(ModeloChecklist modelo)
    {
        _contexto.ModelosChecklist.Add(modelo);
    }

    public void Remover(ModeloChecklist modelo)
    {
        _contexto.ModelosChecklist.Remove(modelo);
    }
}
