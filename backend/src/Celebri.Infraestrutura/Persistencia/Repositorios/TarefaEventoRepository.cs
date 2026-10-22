using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Tarefas;
using Celebri.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class TarefaEventoRepository : ITarefaEventoRepository
{
    private readonly CelebriDbContext _contexto;

    public TarefaEventoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<TarefaEvento>> ListarPorEventoAsync(
        Guid eventoId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento)
    {
        return await Consultar(eventoId, somenteResponsavel)
            .AsNoTracking()
            .ToListAsync(cancelamento);
    }

    public Task<TarefaEvento?> ObterPorIdAsync(
        Guid eventoId,
        Guid tarefaId,
        ResponsavelTarefa? somenteResponsavel,
        CancellationToken cancelamento)
    {
        return Consultar(eventoId, somenteResponsavel)
            .FirstOrDefaultAsync(tarefa => tarefa.Id == tarefaId, cancelamento);
    }

    public Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return _contexto.TarefasEvento.CountAsync(tarefa => tarefa.EventoId == eventoId, cancelamento);
    }

    public async Task<PendenciasTarefas> ListarPendenciasAsync(DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento)
    {
        var fimSemana = TarefaEvento.FimJanelaSemana(hoje);

        var pendentes =
            from tarefa in _contexto.TarefasEvento
            join evento in _contexto.Eventos on tarefa.EventoId equals evento.Id
            where evento.ArquivadoEm == null
                && (tarefa.Status == StatusTarefa.AFazer || tarefa.Status == StatusTarefa.EmAndamento)
                && tarefa.Prazo != null
                && tarefa.Prazo <= fimSemana
            select new { Tarefa = tarefa, Evento = evento };

        var atrasadas = pendentes.Where(item => item.Tarefa.Prazo < hoje);
        var daSemana = pendentes.Where(item => item.Tarefa.Prazo >= hoje);

        var totalAtrasadas = await atrasadas.CountAsync(cancelamento);
        var totalSemana = await daSemana.CountAsync(cancelamento);
        var eventosComAtraso = await atrasadas.Select(item => item.Tarefa.EventoId).Distinct().CountAsync(cancelamento);

        var itensAtrasados = await atrasadas
            .OrderBy(item => item.Tarefa.Prazo)
            .ThenBy(item => item.Tarefa.Titulo)
            .ThenBy(item => item.Tarefa.Id)
            .Take(limitePorGrupo)
            .Select(item => new TarefaPendente(
                item.Tarefa.Id,
                item.Tarefa.EventoId,
                item.Evento.NomePrimeiraPessoa,
                item.Evento.NomeSegundaPessoa,
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
                item.Tarefa.EventoId,
                item.Evento.NomePrimeiraPessoa,
                item.Evento.NomeSegundaPessoa,
                item.Tarefa.Titulo,
                item.Tarefa.Responsavel,
                item.Tarefa.Categoria,
                item.Tarefa.Status,
                item.Tarefa.Prazo!.Value))
            .ToListAsync(cancelamento);

        return new PendenciasTarefas(totalAtrasadas, totalSemana, eventosComAtraso, itensAtrasados, itensSemana);
    }

    public void Adicionar(TarefaEvento tarefa)
    {
        _contexto.TarefasEvento.Add(tarefa);
    }

    public void Remover(TarefaEvento tarefa)
    {
        _contexto.TarefasEvento.Remove(tarefa);
    }

    private IQueryable<TarefaEvento> Consultar(Guid eventoId, ResponsavelTarefa? somenteResponsavel)
    {
        var consulta = _contexto.TarefasEvento.Where(tarefa => tarefa.EventoId == eventoId);

        return somenteResponsavel is { } responsavel
            ? consulta.Where(tarefa => tarefa.Responsavel == responsavel)
            : consulta;
    }
}
