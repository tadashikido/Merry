using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AcessoCronogramaRepository : IAcessoCronogramaRepository
{
    private readonly CasamentoDbContext _contexto;

    public AcessoCronogramaRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.AcessosCronograma.AsNoTracking().FirstOrDefaultAsync(acesso => acesso.TokenHash == tokenHash, cancelamento);
    }

    public async Task<IReadOnlyList<AcessoCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.AcessosCronograma
            .AsNoTracking()
            .Where(acesso => acesso.CasamentoId == casamentoId)
            .ToListAsync(cancelamento);
    }

    public Task<AcessoCronograma?> ObterAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        return _contexto.AcessosCronograma
            .FirstOrDefaultAsync(acesso => acesso.CasamentoId == casamentoId && acesso.Id == acessoId, cancelamento);
    }

    public void Adicionar(AcessoCronograma acesso)
    {
        _contexto.AcessosCronograma.Add(acesso);
    }

    public void Remover(AcessoCronograma acesso)
    {
        _contexto.AcessosCronograma.Remove(acesso);
    }
}
