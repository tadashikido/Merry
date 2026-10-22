using Casamento.Dominio.Autenticacao;

namespace Casamento.Aplicacao.Persistencia;

public interface ITokenRedefinicaoSenhaRepository
{
    Task<TokenRedefinicaoSenha?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<IReadOnlyList<TokenRedefinicaoSenha>> ListarPendentesDoUsuarioAsync(Guid usuarioId, CancellationToken cancelamento);

    void Adicionar(TokenRedefinicaoSenha token);
}
