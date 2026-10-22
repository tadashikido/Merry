namespace Celebri.Aplicacao.Eventos;

public sealed record PreviaDuplicacaoDto(
    EventoResumoDto Origem,
    int Tarefas,
    int TarefasDoChecklist,
    int TarefasNascemAtrasadas,
    int TarefasCanceladasIgnoradas,
    int Fornecedores,
    int FornecedoresIgnorados,
    int ItensCronograma = 0);
