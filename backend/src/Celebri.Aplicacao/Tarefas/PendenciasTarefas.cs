namespace Casamento.Aplicacao.Tarefas;

public sealed record PendenciasTarefas(
    int TotalAtrasadas,
    int TotalEstaSemana,
    int CasamentosComAtraso,
    IReadOnlyList<TarefaPendente> Atrasadas,
    IReadOnlyList<TarefaPendente> EstaSemana);
