using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Autenticacao;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class TokenRedefinicaoSenhaRepository : ITokenRedefinicaoSenhaRepository
{
    private readonly CelebriDbContext _contexto;

    public TokenRedefinicaoSenhaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<TokenRedefinicaoSenha?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.TokensRedefinicaoSenha.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancelamento);
    }

    public async Task<IReadOnlyList<TokenRedefinicaoSenha>> ListarPendentesDoUsuarioAsync(Guid usuarioId, CancellationToken cancelamento)
    {
        return await _contexto.TokensRedefinicaoSenha
            .Where(token => token.UsuarioId == usuarioId && token.UsadoEm == null && token.InvalidadoEm == null)
            .ToListAsync(cancelamento);
    }

    public void Adicionar(TokenRedefinicaoSenha token)
    {
        _contexto.TokensRedefinicaoSenha.Add(token);
    }
}
