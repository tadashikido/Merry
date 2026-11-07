using Celebri.Aplicacao.Impersonacao;
using Celebri.Dominio.Impersonacao;

namespace Celebri.Aplicacao.Persistencia;

public interface ISessaoImpersonacaoRepository
{
    void Adicionar(SessaoImpersonacao sessao);

    Task<SessaoImpersonacao?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    Task<IReadOnlyList<SessaoImpersonacaoResumoDto>> ListarRecentesAsync(int limite, DateTimeOffset agora, CancellationToken cancelamento);
}
