using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosAnfitriao;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AcessoAnfitriaoRepository : IAcessoAnfitriaoRepository
{
    private readonly CelebriDbContext _contexto;

    public AcessoAnfitriaoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<AcessoAnfitriao>> ListarNaoRevogadosAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.AcessosAnfitriao
            .Where(acesso => acesso.EventoId == eventoId && acesso.RevogadoEm == null)
            .ToListAsync(cancelamento);
    }

    public Task<AcessoAnfitriao?> ObterPorIdAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        return _contexto.AcessosAnfitriao.FirstOrDefaultAsync(
            acesso => acesso.Id == acessoId && acesso.EventoId == eventoId,
            cancelamento);
    }

    public Task<bool> ExisteNaoRevogadoComEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return _contexto.AcessosAnfitriao.AnyAsync(acesso => acesso.Email == emailNormalizado && acesso.RevogadoEm == null, cancelamento);
    }

    public void Adicionar(AcessoAnfitriao acesso)
    {
        _contexto.AcessosAnfitriao.Add(acesso);
    }
}
