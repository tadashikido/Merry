using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.Persistencia;

public interface IAplicacaoModeloCronogramaRepository
{
    Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid casamentoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento);

    Task<IReadOnlyList<ItemCronograma>> ListarAncoradosAsync(Guid casamentoId, bool rastrear, CancellationToken cancelamento);
}
