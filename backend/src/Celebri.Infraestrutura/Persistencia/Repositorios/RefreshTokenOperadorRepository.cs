using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Operadores;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class RefreshTokenOperadorRepository : IRefreshTokenOperadorRepository
{
    private readonly CelebriDbContext _contexto;

    public RefreshTokenOperadorRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<RefreshTokenOperador?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.RefreshTokensOperador.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancelamento);
    }

    public async Task<IReadOnlyList<RefreshTokenOperador>> ListarNaoUtilizadosDaFamiliaAsync(Guid familia, CancellationToken cancelamento)
    {
        return await _contexto.RefreshTokensOperador
            .Where(token => token.Familia == familia && token.SubstituidoEm == null && token.RevogadoEm == null)
            .ToListAsync(cancelamento);
    }

    public void Adicionar(RefreshTokenOperador refreshToken)
    {
        _contexto.RefreshTokensOperador.Add(refreshToken);
    }
}
