namespace Celebri.Aplicacao.Casamentos;

public sealed record PreviaDuplicacaoDto(
    CasamentoResumoDto Origem,
    int Tarefas,
    int TarefasDoChecklist,
    int TarefasNascemAtrasadas,
    int TarefasCanceladasIgnoradas,
    int Fornecedores,
    int FornecedoresIgnorados,
    int ItensCronograma = 0);
