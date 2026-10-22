using Celebri.Aplicacao.Tarefas;

namespace Celebri.Aplicacao.Checklists;

public sealed record ChecklistEventoDto(
    ProgressoChecklistDto Progresso,
    DateOnly DataEvento,
    bool EventoArquivado,
    int PrazosDesatualizados,
    IReadOnlyList<TarefaDto> Tarefas);
