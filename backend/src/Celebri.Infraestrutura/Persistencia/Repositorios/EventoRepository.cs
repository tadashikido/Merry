using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class EventoRepository : IEventoRepository
{
    private readonly CelebriDbContext _contexto;

    public EventoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Evento>> ListarAsync(bool arquivados, CancellationToken cancelamento)
    {
        var consulta = _contexto.Eventos.AsNoTracking();

        consulta = arquivados
            ? consulta.Where(evento => evento.ArquivadoEm != null)
            : consulta.Where(evento => evento.ArquivadoEm == null);

        return await consulta.OrderBy(evento => evento.Data).ToListAsync(cancelamento);
    }

    public Task<Evento?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return _contexto.Eventos.FirstOrDefaultAsync(evento => evento.Id == id, cancelamento);
    }

    public void Adicionar(Evento evento)
    {
        _contexto.Eventos.Add(evento);
    }
}
