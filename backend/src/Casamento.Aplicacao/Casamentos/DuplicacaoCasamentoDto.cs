namespace Casamento.Aplicacao.Casamentos;

public sealed record DuplicacaoCasamentoDto(
    CasamentoDto Casamento,
    int TarefasCopiadas,
    int FornecedoresCopiados,
    int ItensCronogramaCopiados = 0);
