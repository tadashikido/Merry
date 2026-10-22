using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.Persistencia;

public interface IAplicacaoModeloCronogramaRepository
{
    Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid eventoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento);

    Task<IReadOnlyList<ItemCronograma>> ListarAncoradosAsync(Guid eventoId, bool rastrear, CancellationToken cancelamento);
}
