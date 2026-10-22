using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Autenticacao;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly CasamentoDbContext _contexto;

    public RefreshTokenRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<RefreshToken?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.RefreshTokens.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancelamento);
    }

    public async Task<IReadOnlyList<RefreshToken>> ListarNaoUtilizadosDaFamiliaAsync(Guid familia, CancellationToken cancelamento)
    {
        return await _contexto.RefreshTokens
            .Where(token => token.Familia == familia && token.SubstituidoEm == null && token.RevogadoEm == null)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<RefreshToken>> ListarNaoUtilizadosDoUsuarioAsync(Guid usuarioId, CancellationToken cancelamento)
    {
        return await _contexto.RefreshTokens
            .Where(token => token.UsuarioId == usuarioId && token.SubstituidoEm == null && token.RevogadoEm == null)
            .ToListAsync(cancelamento);
    }

    public void Adicionar(RefreshToken refreshToken)
    {
        _contexto.RefreshTokens.Add(refreshToken);
    }
}
