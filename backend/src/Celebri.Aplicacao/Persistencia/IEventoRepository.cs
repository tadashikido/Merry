using Celebri.Dominio.Eventos;

namespace Celebri.Aplicacao.Persistencia;

public interface IEventoRepository
{
    Task<IReadOnlyList<Evento>> ListarAsync(bool arquivados, CancellationToken cancelamento);

    Task<Evento?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    void Adicionar(Evento evento);
}
