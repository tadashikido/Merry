using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Tarefas;

public static class OrdenacaoTarefas
{
    public static IReadOnlyList<TarefaEvento> Ordenar(IEnumerable<TarefaEvento> tarefas)
    {
        ArgumentNullException.ThrowIfNull(tarefas);

        var lista = tarefas.ToList();

        var abertas = lista
            .Where(tarefa => tarefa.EstaAberta)
            .OrderBy(tarefa => tarefa.Prazo is null)
            .ThenBy(tarefa => tarefa.Prazo)
            .ThenBy(tarefa => tarefa.CriadoEm)
            .ThenBy(tarefa => tarefa.Id);

        var encerradas = lista
            .Where(tarefa => !tarefa.EstaAberta)
            .OrderByDescending(tarefa => tarefa.ConcluidaEm ?? tarefa.AtualizadoEm)
            .ThenBy(tarefa => tarefa.Id);

        return abertas.Concat(encerradas).ToList();
    }

    public static ResumoTarefasDto Resumir(IReadOnlyCollection<TarefaEvento> tarefas, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(tarefas);

        return new ResumoTarefasDto(
            tarefas.Count(tarefa => tarefa.EstaAberta),
            tarefas.Count(tarefa => tarefa.EstaAtrasada(hoje)),
            tarefas.Count(tarefa => tarefa.VenceNaSemana(hoje)),
            tarefas.Count(tarefa => tarefa.Status == StatusTarefa.Concluida),
            tarefas.Count(tarefa => tarefa.Status == StatusTarefa.Cancelada),
            tarefas.Count);
    }
}
