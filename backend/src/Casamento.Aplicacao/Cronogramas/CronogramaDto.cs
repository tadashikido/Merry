namespace Casamento.Aplicacao.Cronogramas;

public sealed record CronogramaDto(
    Guid CasamentoId,
    DateOnly DataCasamento,
    string? HorarioCerimonia,
    string? LocalCerimonia,
    string? LocalRecepcao,
    bool Arquivado,
    bool SomenteLeitura,
    IReadOnlyList<ItemCronogramaDto> Itens,
    int ItensComConflito,
    IReadOnlyList<FornecedorItemCronogramaDto> FornecedoresDisponiveis,
    int HorariosDesatualizados = 0);
