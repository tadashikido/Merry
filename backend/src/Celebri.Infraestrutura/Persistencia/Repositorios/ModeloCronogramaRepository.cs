using Celebri.Aplicacao.ModelosCronograma;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ModeloCronogramaRepository : IModeloCronogramaRepository
{
    private readonly CelebriDbContext _contexto;

    public ModeloCronogramaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<ModeloCronogramaResumo>> ListarAsync(CancellationToken cancelamento)
    {
        return await _contexto.ModelosCronograma
            .AsNoTracking()
            .Select(modelo => new ModeloCronogramaResumo(
                modelo.Id,
                modelo.Nome,
                modelo.Descricao,
                modelo.HorarioReferencia,
                modelo.Sugerido,
                _contexto.ItensModeloCronograma.Count(item => item.ModeloId == modelo.Id),
                modelo.AtualizadoEm))
            .ToListAsync(cancelamento);
    }

    public Task<ModeloCronograma?> ObterComItensAsync(Guid modeloId, CancellationToken cancelamento)
    {
        return _contexto.ModelosCronograma
            .Include(modelo => modelo.Itens)
            .FirstOrDefaultAsync(modelo => modelo.Id == modeloId, cancelamento);
    }

    public Task<int> ContarAsync(CancellationToken cancelamento)
    {
        return _contexto.ModelosCronograma.CountAsync(cancelamento);
    }

    public Task<bool> ExisteNomeAsync(string nome, Guid? ignorarModeloId, CancellationToken cancelamento)
    {
        var nomeMinusculo = nome.ToLower();

        return _contexto.ModelosCronograma.AnyAsync(
            modelo => modelo.Nome.ToLower() == nomeMinusculo && (ignorarModeloId == null || modelo.Id != ignorarModeloId),
            cancelamento);
    }

    public void Adicionar(ModeloCronograma modelo)
    {
        _contexto.ModelosCronograma.Add(modelo);
    }

    public void Remover(ModeloCronograma modelo)
    {
        _contexto.ModelosCronograma.Remove(modelo);
    }
}
