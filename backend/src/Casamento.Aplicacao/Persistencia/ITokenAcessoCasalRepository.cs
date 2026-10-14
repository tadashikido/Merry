using Casamento.Dominio.AcessosCasal;

namespace Casamento.Aplicacao.Persistencia;

public interface ITokenAcessoCasalRepository
{
    Task<TokenAcessoCasal?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<TokenAcessoCasal?> ObterPorAcessoAsync(Guid acessoCasalId, CancellationToken cancelamento);

    void Adicionar(TokenAcessoCasal token);

    void Remover(TokenAcessoCasal token);
}
