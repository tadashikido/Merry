namespace Celebri.Aplicacao.Checklists;

public sealed record AplicacaoModeloChecklistDto(
    int ItensNoModelo,
    int TarefasCriadas,
    int JaAplicadas,
    int NascemAtrasadas,
    int TarefasNoCasamento,
    bool ExcedeLimite,
    ProgressoChecklistDto Progresso);
