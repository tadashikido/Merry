namespace Celebri.Aplicacao.Tarefas;

public sealed record ListaTarefasDto(
    IReadOnlyList<TarefaDto> Tarefas,
    ResumoTarefasDto Resumo,
    bool EventoArquivado,
    bool SomenteDoAnfitriao);
