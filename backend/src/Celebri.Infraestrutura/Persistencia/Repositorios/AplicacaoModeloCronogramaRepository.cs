using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AplicacaoModeloCronogramaRepository : IAplicacaoModeloCronogramaRepository
{
    private readonly CelebriDbContext _contexto;

    public AplicacaoModeloCronogramaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid eventoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento)
    {
        if (itensModelo.Count == 0)
        {
            return [];
        }

        return await _contexto.ItensCronograma
            .AsNoTracking()
            .Where(item => item.EventoId == eventoId
                && item.OrigemModeloItemId != null
                && itensModelo.Contains(item.OrigemModeloItemId.Value))
            .Select(item => item.OrigemModeloItemId!.Value)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<ItemCronograma>> ListarAncoradosAsync(
        Guid eventoId,
        bool rastrear,
        CancellationToken cancelamento)
    {
        var consulta = _contexto.ItensCronograma
            .Where(item => item.EventoId == eventoId && item.MinutosRelativosCerimonia != null);

        if (!rastrear)
        {
            consulta = consulta.AsNoTracking();
        }

        return await consulta.ToListAsync(cancelamento);
    }
}
