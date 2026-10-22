using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosCasal;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class TokenAcessoCasalRepository : ITokenAcessoCasalRepository
{
    private readonly CasamentoDbContext _contexto;

    public TokenAcessoCasalRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<TokenAcessoCasal?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.TokensAcessoCasal.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancelamento);
    }

    public Task<TokenAcessoCasal?> ObterPorAcessoAsync(Guid acessoCasalId, CancellationToken cancelamento)
    {
        return _contexto.TokensAcessoCasal.FirstOrDefaultAsync(token => token.AcessoCasalId == acessoCasalId, cancelamento);
    }

    public void Adicionar(TokenAcessoCasal token)
    {
        _contexto.TokensAcessoCasal.Add(token);
    }

    public void Remover(TokenAcessoCasal token)
    {
        _contexto.TokensAcessoCasal.Remove(token);
    }
}
