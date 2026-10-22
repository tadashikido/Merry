using Celebri.Aplicacao.Tarefas;

namespace Celebri.Aplicacao.Checklists;

public sealed record ChecklistCasamentoDto(
    ProgressoChecklistDto Progresso,
    DateOnly DataCasamento,
    bool CasamentoArquivado,
    int PrazosDesatualizados,
    IReadOnlyList<TarefaDto> Tarefas);
