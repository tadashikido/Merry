using Celebri.Aplicacao.Checklists;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ChecklistRepository : IChecklistRepository
{
    private readonly CelebriDbContext _contexto;

    public ChecklistRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<ProgressoChecklist> ObterProgressoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var contagem = await DoChecklist(eventoId)
            .GroupBy(tarefa => tarefa.EventoId)
            .Select(grupo => new
            {
                Total = grupo.Count(),
                Concluidas = grupo.Count(tarefa => tarefa.Status == StatusTarefa.Concluida),
                Canceladas = grupo.Count(tarefa => tarefa.Status == StatusTarefa.Cancelada),
            })
            .FirstOrDefaultAsync(cancelamento);

        return contagem is null
            ? ProgressoChecklist.Vazio
            : new ProgressoChecklist(contagem.Total, contagem.Concluidas, contagem.Canceladas);
    }

    public async Task<IReadOnlyList<TarefaEvento>> ListarTarefasAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await DoChecklist(eventoId).AsNoTracking().ToListAsync(cancelamento);
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

        var itens = itensModelo.ToArray();

        return await DoChecklist(eventoId)
            .Where(tarefa => itens.Contains(tarefa.OrigemModeloItemId!.Value))
            .Select(tarefa => tarefa.OrigemModeloItemId!.Value)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarAbertasComPrazoRelativoAsync(
        Guid eventoId,
        bool rastrear,
        CancellationToken cancelamento)
    {
        var tarefas = rastrear ? _contexto.TarefasEvento : _contexto.TarefasEvento.AsNoTracking();

        var consulta =
            from tarefa in tarefas
            join item in _contexto.ItensModeloChecklist on tarefa.OrigemModeloItemId equals (Guid?)item.Id
            where tarefa.EventoId == eventoId
                && (tarefa.Status == StatusTarefa.AFazer || tarefa.Status == StatusTarefa.EmAndamento)
            select new { Tarefa = tarefa, item.DiasAntesDoEvento };

        var resultado = await consulta.ToListAsync(cancelamento);
        return resultado.Select(linha => new TarefaComPrazoRelativo(linha.Tarefa, linha.DiasAntesDoEvento)).ToList();
    }

    private IQueryable<TarefaEvento> DoChecklist(Guid eventoId)
    {
        return _contexto.TarefasEvento
            .Where(tarefa => tarefa.EventoId == eventoId && tarefa.OrigemModeloItemId != null);
    }
}
