using Celebri.Dominio.AcessosAnfitriao;

namespace Celebri.Aplicacao.Persistencia;

public interface IAcessoAnfitriaoRepository
{
    Task<IReadOnlyList<AcessoAnfitriao>> ListarNaoRevogadosAsync(Guid eventoId, CancellationToken cancelamento);

    Task<AcessoAnfitriao?> ObterPorIdAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento);

    Task<bool> ExisteNaoRevogadoComEmailAsync(string emailNormalizado, CancellationToken cancelamento);

    void Adicionar(AcessoAnfitriao acesso);
}
