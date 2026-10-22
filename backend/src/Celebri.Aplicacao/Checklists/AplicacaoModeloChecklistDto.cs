namespace Celebri.Aplicacao.Checklists;

public sealed record AplicacaoModeloChecklistDto(
    int ItensNoModelo,
    int TarefasCriadas,
    int JaAplicadas,
    int NascemAtrasadas,
    int TarefasNoEvento,
    bool ExcedeLimite,
    ProgressoChecklistDto Progresso);
