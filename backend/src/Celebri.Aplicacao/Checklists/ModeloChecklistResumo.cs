namespace Casamento.Aplicacao.Checklists;

public sealed record ModeloChecklistResumo(
    Guid Id,
    string Nome,
    string? Descricao,
    bool Sugerido,
    int QuantidadeItens,
    DateTimeOffset AtualizadoEm);
