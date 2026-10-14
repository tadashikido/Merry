using Casamento.Aplicacao.Tarefas;

namespace Casamento.Aplicacao.Checklists;

public sealed record ChecklistCasamentoDto(
    ProgressoChecklistDto Progresso,
    DateOnly DataCasamento,
    bool CasamentoArquivado,
    int PrazosDesatualizados,
    IReadOnlyList<TarefaDto> Tarefas);
