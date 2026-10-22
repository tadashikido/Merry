using Celebri.Dominio.Financeiro;

namespace Celebri.Aplicacao.Persistencia;

public interface IParcelaFornecedorRepository
{
    Task<IReadOnlyList<ParcelaFornecedor>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculosAsync(IReadOnlyCollection<Guid> vinculoIds, CancellationToken cancelamento);

    Task<ParcelaFornecedor?> ObterAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<TotaisParcelasVinculo> ObterTotaisPorVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<AlertasParcelas> ListarAlertasAsync(Guid? eventoId, DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento);

    void Adicionar(ParcelaFornecedor parcela);

    void Remover(ParcelaFornecedor parcela);
}
