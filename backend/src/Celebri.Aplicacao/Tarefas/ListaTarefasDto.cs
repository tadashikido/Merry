namespace Celebri.Aplicacao.Tarefas;

public sealed record ListaTarefasDto(
    IReadOnlyList<TarefaDto> Tarefas,
    ResumoTarefasDto Resumo,
    bool CasamentoArquivado,
    bool SomenteDoCasal);
