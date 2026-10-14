using Casamento.Aplicacao.Checklists;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class ChecklistRepository : IChecklistRepository
{
    private readonly CasamentoDbContext _contexto;

    public ChecklistRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<ProgressoChecklist> ObterProgressoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var contagem = await DoChecklist(casamentoId)
            .GroupBy(tarefa => tarefa.CasamentoId)
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

    public async Task<IReadOnlyList<TarefaCasamento>> ListarTarefasAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await DoChecklist(casamentoId).AsNoTracking().ToListAsync(cancelamento);
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

        var itens = itensModelo.ToArray();

        return await DoChecklist(casamentoId)
            .Where(tarefa => itens.Contains(tarefa.OrigemModeloItemId!.Value))
            .Select(tarefa => tarefa.OrigemModeloItemId!.Value)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<TarefaComPrazoRelativo>> ListarAbertasComPrazoRelativoAsync(
        Guid casamentoId,
        bool rastrear,
        CancellationToken cancelamento)
    {
        var tarefas = rastrear ? _contexto.TarefasCasamento : _contexto.TarefasCasamento.AsNoTracking();

        var consulta =
            from tarefa in tarefas
            join item in _contexto.ItensModeloChecklist on tarefa.OrigemModeloItemId equals (Guid?)item.Id
            where tarefa.CasamentoId == casamentoId
                && (tarefa.Status == StatusTarefa.AFazer || tarefa.Status == StatusTarefa.EmAndamento)
            select new { Tarefa = tarefa, item.DiasAntesDoCasamento };

        var resultado = await consulta.ToListAsync(cancelamento);
        return resultado.Select(linha => new TarefaComPrazoRelativo(linha.Tarefa, linha.DiasAntesDoCasamento)).ToList();
    }

    private IQueryable<TarefaCasamento> DoChecklist(Guid casamentoId)
    {
        return _contexto.TarefasCasamento
            .Where(tarefa => tarefa.CasamentoId == casamentoId && tarefa.OrigemModeloItemId != null);
    }
}
