using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.Persistencia;

public interface IUsuarioRepository
{
    Task<Usuario?> ObterPorEmailAsync(string emailNormalizado, CancellationToken cancelamento);

    Task<Usuario?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken cancelamento);

    void Adicionar(Usuario usuario);
}
