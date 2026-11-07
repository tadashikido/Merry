using Celebri.Aplicacao.Impersonacao;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Impersonacao;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class SessaoImpersonacaoRepository : ISessaoImpersonacaoRepository
{
    private readonly CelebriDbContext _contexto;

    public SessaoImpersonacaoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public void Adicionar(SessaoImpersonacao sessao)
    {
        _contexto.SessoesImpersonacao.Add(sessao);
    }

    public Task<SessaoImpersonacao?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return _contexto.SessoesImpersonacao.FirstOrDefaultAsync(sessao => sessao.Id == id, cancelamento);
    }

    public async Task<IReadOnlyList<SessaoImpersonacaoResumoDto>> ListarRecentesAsync(int limite, DateTimeOffset agora, CancellationToken cancelamento)
    {
        return await _contexto.SessoesImpersonacao.AsNoTracking()
            .OrderByDescending(sessao => sessao.IniciadaEm)
            .Take(limite)
            .Join(
                _contexto.Organizacoes.AsNoTracking(),
                sessao => sessao.OrganizacaoId,
                organizacao => organizacao.Id,
                (sessao, organizacao) => new SessaoImpersonacaoResumoDto(
                    sessao.Id,
                    sessao.OrganizacaoId,
                    organizacao.Nome,
                    sessao.Motivo,
                    sessao.IniciadaEm,
                    sessao.EncerradaEm,
                    sessao.ExpiraEm,
                    sessao.EncerradaEm == null && sessao.ExpiraEm > agora))
            .ToListAsync(cancelamento);
    }
}
