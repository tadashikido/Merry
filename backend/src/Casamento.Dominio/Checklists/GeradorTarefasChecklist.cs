using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Tarefas;

namespace Casamento.Dominio.Checklists;

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

    public static IReadOnlyList<TarefaCasamento> Gerar(
        CasamentoAssessorado casamento,
        IEnumerable<ItemModeloChecklist> itensPendentes,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(casamento);
        ArgumentNullException.ThrowIfNull(itensPendentes);

        return itensPendentes
            .Select(item => TarefaCasamento.Criar(
                casamento.Id,
                item.ParaDadosTarefa(casamento.Data),
                criadoPorUsuarioId,
                agora,
                origemModeloItemId: item.Id))
            .ToList();
    }

    public static bool PrazoDesatualizado(TarefaCasamento tarefa, int diasAntesDoCasamento, DateOnly dataCasamento)
    {
        ArgumentNullException.ThrowIfNull(tarefa);

        return tarefa.EstaAberta
            && tarefa.OrigemModeloItemId is not null
            && tarefa.Prazo != ItemModeloChecklist.CalcularPrazo(dataCasamento, diasAntesDoCasamento);
    }
}
