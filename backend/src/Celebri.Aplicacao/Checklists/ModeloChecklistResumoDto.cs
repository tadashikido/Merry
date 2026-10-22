namespace Celebri.Aplicacao.Checklists;

public sealed record ModeloChecklistResumoDto(
    Guid Id,
    string Nome,
    string? Descricao,
    bool Sugerido,
    int QuantidadeItens,
    DateTimeOffset AtualizadoEm);
