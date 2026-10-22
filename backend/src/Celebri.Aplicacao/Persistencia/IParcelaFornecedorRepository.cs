using Casamento.Dominio.Financeiro;

namespace Casamento.Aplicacao.Persistencia;

public interface IParcelaFornecedorRepository
{
    Task<IReadOnlyList<ParcelaFornecedor>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculosAsync(IReadOnlyCollection<Guid> vinculoIds, CancellationToken cancelamento);

    Task<ParcelaFornecedor?> ObterAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<TotaisParcelasVinculo> ObterTotaisPorVinculoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<AlertasParcelas> ListarAlertasAsync(Guid? casamentoId, DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento);

    void Adicionar(ParcelaFornecedor parcela);

    void Remover(ParcelaFornecedor parcela);
}
