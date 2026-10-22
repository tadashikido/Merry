using Celebri.Dominio.Convidados;
using Celebri.Dominio.Mesas;

namespace Celebri.Aplicacao.Persistencia;

public interface IMesaRepository
{
    Task<IReadOnlyList<Mesa>> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<Mesa?> ObterAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento);

    Task<int> ContarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<bool> ExisteNumeroAsync(Guid eventoId, int numero, Guid? excetoMesaId, CancellationToken cancelamento);

    Task<bool> ExisteEspecialAsync(Guid eventoId, Guid? excetoMesaId, CancellationToken cancelamento);

    Task<int> ContarOcupacaoAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento);

    Task<IReadOnlyList<Convidado>> ObterConvidadosAsync(Guid eventoId, IReadOnlyCollection<Guid> convidadosIds, CancellationToken cancelamento);

    void Adicionar(Mesa mesa);

    void Remover(Mesa mesa);
}
