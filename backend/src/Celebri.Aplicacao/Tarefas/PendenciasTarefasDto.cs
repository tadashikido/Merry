namespace Celebri.Aplicacao.Tarefas;

public sealed record PendenciasTarefasDto(
    int TotalAtrasadas,
    int TotalEstaSemana,
    int EventosComAtraso,
    IReadOnlyList<TarefaPendenteDto> Atrasadas,
    IReadOnlyList<TarefaPendenteDto> EstaSemana);
