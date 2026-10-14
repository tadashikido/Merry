namespace Casamento.Aplicacao.Tarefas;

public sealed record PendenciasTarefasDto(
    int TotalAtrasadas,
    int TotalEstaSemana,
    int CasamentosComAtraso,
    IReadOnlyList<TarefaPendenteDto> Atrasadas,
    IReadOnlyList<TarefaPendenteDto> EstaSemana);
