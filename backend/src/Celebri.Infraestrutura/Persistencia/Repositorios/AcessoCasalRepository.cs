using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.AcessosCasal;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class AcessoCasalRepository : IAcessoCasalRepository
{
    private readonly CasamentoDbContext _contexto;

    public AcessoCasalRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<AcessoCasal>> ListarNaoRevogadosAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.AcessosCasal
            .Where(acesso => acesso.CasamentoId == casamentoId && acesso.RevogadoEm == null)
            .ToListAsync(cancelamento);
    }

    public Task<AcessoCasal?> ObterPorIdAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        return _contexto.AcessosCasal.FirstOrDefaultAsync(
            acesso => acesso.Id == acessoId && acesso.CasamentoId == casamentoId,
            cancelamento);
    }

    public Task<bool> ExisteNaoRevogadoComEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return _contexto.AcessosCasal.AnyAsync(acesso => acesso.Email == emailNormalizado && acesso.RevogadoEm == null, cancelamento);
    }

    public void Adicionar(AcessoCasal acesso)
    {
        _contexto.AcessosCasal.Add(acesso);
    }
}
