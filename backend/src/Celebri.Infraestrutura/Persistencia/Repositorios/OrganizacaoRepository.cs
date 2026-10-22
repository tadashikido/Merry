using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class OrganizacaoRepository : IOrganizacaoRepository
{
    private readonly CasamentoDbContext _contexto;

    public OrganizacaoRepository(CasamentoDbContext contexto)
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
