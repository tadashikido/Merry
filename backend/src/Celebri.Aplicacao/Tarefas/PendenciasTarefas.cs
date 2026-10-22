namespace Celebri.Aplicacao.Tarefas;

public sealed record PendenciasTarefas(
    int TotalAtrasadas,
    int TotalEstaSemana,
    int EventosComAtraso,
    IReadOnlyList<TarefaPendente> Atrasadas,
    IReadOnlyList<TarefaPendente> EstaSemana);
