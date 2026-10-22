using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.Persistencia;

public interface IAcessoCronogramaRepository
{
    Task<AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<IReadOnlyList<AcessoCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<AcessoCronograma?> ObterAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento);

    void Adicionar(AcessoCronograma acesso);

    void Remover(AcessoCronograma acesso);
}
