using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Casamentos;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class CasamentoRepository : ICasamentoRepository
{
    private readonly CasamentoDbContext _contexto;

    public CasamentoRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento)
    {
        var consulta = _contexto.Casamentos.AsNoTracking();

        consulta = arquivados
            ? consulta.Where(casamento => casamento.ArquivadoEm != null)
            : consulta.Where(casamento => casamento.ArquivadoEm == null);

        return await consulta.OrderBy(casamento => casamento.Data).ToListAsync(cancelamento);
    }

    public Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return _contexto.Casamentos.FirstOrDefaultAsync(casamento => casamento.Id == id, cancelamento);
    }

    public void Adicionar(CasamentoAssessorado casamento)
    {
        _contexto.Casamentos.Add(casamento);
    }
}
