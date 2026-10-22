using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosAnfitriao;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class TokenAcessoAnfitriaoRepository : ITokenAcessoAnfitriaoRepository
{
    private readonly CelebriDbContext _contexto;

    public TokenAcessoAnfitriaoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<TokenAcessoAnfitriao?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.TokensAcessoAnfitriao.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancelamento);
    }

    public Task<TokenAcessoAnfitriao?> ObterPorAcessoAsync(Guid acessoAnfitriaoId, CancellationToken cancelamento)
    {
        return _contexto.TokensAcessoAnfitriao.FirstOrDefaultAsync(token => token.AcessoAnfitriaoId == acessoAnfitriaoId, cancelamento);
    }

    public void Adicionar(TokenAcessoAnfitriao token)
    {
        _contexto.TokensAcessoAnfitriao.Add(token);
    }

    public void Remover(TokenAcessoAnfitriao token)
    {
        _contexto.TokensAcessoAnfitriao.Remove(token);
    }
}
