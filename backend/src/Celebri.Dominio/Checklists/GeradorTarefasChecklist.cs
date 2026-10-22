using Celebri.Dominio.Eventos;
using Celebri.Dominio.Tarefas;

namespace Celebri.Dominio.Checklists;

public static class GeradorTarefasChecklist
{
    public static IReadOnlyList<ItemModeloChecklist> ItensPendentes(
        IEnumerable<ItemModeloChecklist> itens,
        IReadOnlyCollection<Guid> origensJaAplicadas)
    {
        ArgumentNullException.ThrowIfNull(itens);
        ArgumentNullException.ThrowIfNull(origensJaAplicadas);

        var aplicadas = origensJaAplicadas.ToHashSet();
        return itens.Where(item => !aplicadas.Contains(item.Id)).ToList();
    }

    public static IReadOnlyList<TarefaEvento> Gerar(
        Evento evento,
        IEnumerable<ItemModeloChecklist> itensPendentes,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(evento);
        ArgumentNullException.ThrowIfNull(itensPendentes);

        return itensPendentes
            .Select(item => TarefaEvento.Criar(
                evento.Id,
                item.ParaDadosTarefa(evento.Data),
                criadoPorUsuarioId,
                agora,
                origemModeloItemId: item.Id))
            .ToList();
    }

    public static bool PrazoDesatualizado(TarefaEvento tarefa, int diasAntesDoEvento, DateOnly dataEvento)
    {
        ArgumentNullException.ThrowIfNull(tarefa);

        return tarefa.EstaAberta
            && tarefa.OrigemModeloItemId is not null
            && tarefa.Prazo != ItemModeloChecklist.CalcularPrazo(dataEvento, diasAntesDoEvento);
    }
}
