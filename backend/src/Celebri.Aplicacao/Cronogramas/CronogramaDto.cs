namespace Celebri.Aplicacao.Cronogramas;

public sealed record CronogramaDto(
    Guid EventoId,
    DateOnly DataEvento,
    string? HorarioCerimonia,
    string? LocalCerimonia,
    string? LocalRecepcao,
    bool Arquivado,
    bool SomenteLeitura,
    IReadOnlyList<ItemCronogramaDto> Itens,
    int ItensComConflito,
    IReadOnlyList<FornecedorItemCronogramaDto> FornecedoresDisponiveis,
    int HorariosDesatualizados = 0);
