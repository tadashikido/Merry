using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AplicacaoModeloCronogramaRepository : IAplicacaoModeloCronogramaRepository
{
    private readonly CasamentoDbContext _contexto;

    public AplicacaoModeloCronogramaRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Guid>> ListarOrigensAplicadasAsync(
        Guid casamentoId,
        IReadOnlyCollection<Guid> itensModelo,
        CancellationToken cancelamento)
    {
        if (itensModelo.Count == 0)
        {
            return [];
        }

        return await _contexto.ItensCronograma
            .AsNoTracking()
            .Where(item => item.CasamentoId == casamentoId
                && item.OrigemModeloItemId != null
                && itensModelo.Contains(item.OrigemModeloItemId.Value))
            .Select(item => item.OrigemModeloItemId!.Value)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<ItemCronograma>> ListarAncoradosAsync(
        Guid casamentoId,
        bool rastrear,
        CancellationToken cancelamento)
    {
        var consulta = _contexto.ItensCronograma
            .Where(item => item.CasamentoId == casamentoId && item.MinutosRelativosCerimonia != null);

        if (!rastrear)
        {
            consulta = consulta.AsNoTracking();
        }

        return await consulta.ToListAsync(cancelamento);
    }
}
