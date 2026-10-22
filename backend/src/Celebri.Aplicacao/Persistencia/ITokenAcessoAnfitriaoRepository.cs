using Celebri.Dominio.AcessosAnfitriao;

namespace Celebri.Aplicacao.Persistencia;

public interface ITokenAcessoAnfitriaoRepository
{
    Task<TokenAcessoAnfitriao?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<TokenAcessoAnfitriao?> ObterPorAcessoAsync(Guid acessoAnfitriaoId, CancellationToken cancelamento);

    void Adicionar(TokenAcessoAnfitriao token);

    void Remover(TokenAcessoAnfitriao token);
}
