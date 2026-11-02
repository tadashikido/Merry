using Celebri.Dominio.Operadores;

namespace Celebri.Aplicacao.Persistencia;

public interface IRefreshTokenOperadorRepository
{
    Task<RefreshTokenOperador?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<IReadOnlyList<RefreshTokenOperador>> ListarNaoUtilizadosDaFamiliaAsync(Guid familia, CancellationToken cancelamento);

    void Adicionar(RefreshTokenOperador refreshToken);
}
