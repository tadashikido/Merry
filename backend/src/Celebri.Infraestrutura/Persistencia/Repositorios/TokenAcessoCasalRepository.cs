using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.AcessosCasal;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

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
