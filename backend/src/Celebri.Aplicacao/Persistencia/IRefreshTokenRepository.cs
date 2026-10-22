using Celebri.Dominio.Autenticacao;

namespace Celebri.Aplicacao.Persistencia;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<IReadOnlyList<RefreshToken>> ListarNaoUtilizadosDaFamiliaAsync(Guid familia, CancellationToken cancelamento);

    Task<IReadOnlyList<RefreshToken>> ListarNaoUtilizadosDoUsuarioAsync(Guid usuarioId, CancellationToken cancelamento);

    void Adicionar(RefreshToken refreshToken);
}
