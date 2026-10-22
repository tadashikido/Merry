using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class OrganizacaoRepository : IOrganizacaoRepository
{
    private readonly CelebriDbContext _contexto;

    public OrganizacaoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<Organizacao?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return _contexto.Organizacoes.FirstOrDefaultAsync(organizacao => organizacao.Id == id, cancelamento);
    }

    public async Task<IReadOnlyList<Guid>> ListarIdsAsync(CancellationToken cancelamento)
    {
        return await _contexto.Organizacoes.AsNoTracking().OrderBy(organizacao => organizacao.Id).Select(organizacao => organizacao.Id).ToListAsync(cancelamento);
    }

    public void Adicionar(Organizacao organizacao)
    {
        _contexto.Organizacoes.Add(organizacao);
    }
}
