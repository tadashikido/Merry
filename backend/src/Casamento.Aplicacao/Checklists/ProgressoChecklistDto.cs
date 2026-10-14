namespace Casamento.Aplicacao.Checklists;

public sealed record ProgressoChecklistDto(
    int? Percentual,
    int Concluidas,
    int Consideradas,
    int Canceladas,
    int Total);
