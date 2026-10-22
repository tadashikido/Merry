using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.Tarefas;
using Casamento.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class TarefaCasamentoRepository : ITarefaCasamentoRepository
{
    private readonly CasamentoDbContext _contexto;

    public TarefaCasamentoRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<TarefaCasamento>> ListarPorCasamentoAsync(
        Guid casamentoId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento)
    {
        return await Consultar(casamentoId, somenteResponsavel)
            .AsNoTracking()
            .ToListAsync(cancelamento);
    }

    public Task<TarefaCasamento?> ObterPorIdAsync(
        Guid casamentoId,
        Guid tarefaId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento)
    {
        return Consultar(casamentoId, somenteResponsavel)
            .FirstOrDefaultAsync(tarefa => tarefa.Id == tarefaId, cancelamento);
    }

    public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return _contexto.TarefasCasamento.CountAsync(tarefa => tarefa.CasamentoId == casamentoId, cancelamento);
    }

    public async Task<PendenciasTarefas> ListarPendenciasAsync(DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento)
    {
        var fimSemana = TarefaCasamento.FimJanelaSemana(hoje);

        var pendentes =
            from tarefa in _contexto.TarefasCasamento
            join casamento in _contexto.Casamentos on tarefa.CasamentoId equals casamento.Id
            where casamento.ArquivadoEm == null
                && (tarefa.Status == StatusTarefa.AFazer || tarefa.Status == StatusTarefa.EmAndamento)
                && tarefa.Prazo != null
                && tarefa.Prazo <= fimSemana
            select new { Tarefa = tarefa, Casamento = casamento };

        var atrasadas = pendentes.Where(item => item.Tarefa.Prazo < hoje);
        var daSemana = pendentes.Where(item => item.Tarefa.Prazo >= hoje);

        var totalAtrasadas = await atrasadas.CountAsync(cancelamento);
        var totalSemana = await daSemana.CountAsync(cancelamento);
        var casamentosComAtraso = await atrasadas.Select(item => item.Tarefa.CasamentoId).Distinct().CountAsync(cancelamento);

        var itensAtrasados = await atrasadas
            .OrderBy(item => item.Tarefa.Prazo)
            .ThenBy(item => item.Tarefa.Titulo)
            .ThenBy(item => item.Tarefa.Id)
            .Take(limitePorGrupo)
            .Select(item => new TarefaPendente(
                item.Tarefa.Id,
                item.Tarefa.CasamentoId,
                item.Casamento.NomePrimeiraPessoa,
                item.Casamento.NomeSegundaPessoa,
                item.Tarefa.Titulo,
                item.Tarefa.Responsavel,
                item.Tarefa.Categoria,
                item.Tarefa.Status,
                item.Tarefa.Prazo!.Value))
            .ToListAsync(cancelamento);

        var itensSemana = await daSemana
            .OrderBy(item => item.Tarefa.Prazo)
            .ThenBy(item => item.Tarefa.Titulo)
            .ThenBy(item => item.Tarefa.Id)
            .Take(limitePorGrupo)
            .Select(item => new TarefaPendente(
                item.Tarefa.Id,
                item.Tarefa.CasamentoId,
                item.Casamento.NomePrimeiraPessoa,
                item.Casamento.NomeSegundaPessoa,
                item.Tarefa.Titulo,
                item.Tarefa.Responsavel,
                item.Tarefa.Categoria,
                item.Tarefa.Status,
                item.Tarefa.Prazo!.Value))
            .ToListAsync(cancelamento);

        return new PendenciasTarefas(totalAtrasadas, totalSemana, casamentosComAtraso, itensAtrasados, itensSemana);
    }

    public void Adicionar(TarefaCasamento tarefa)
    {
        _contexto.TarefasCasamento.Add(tarefa);
    }

    public void Remover(TarefaCasamento tarefa)
    {
        _contexto.TarefasCasamento.Remove(tarefa);
    }

    private IQueryable<TarefaCasamento> Consultar(Guid casamentoId, ResponsavelTarefa? somenteResponsavel)
    {
        var consulta = _contexto.TarefasCasamento.Where(tarefa => tarefa.CasamentoId == casamentoId);

        return somenteResponsavel is { } responsavel
            ? consulta.Where(tarefa => tarefa.Responsavel == responsavel)
            : consulta;
    }
}
