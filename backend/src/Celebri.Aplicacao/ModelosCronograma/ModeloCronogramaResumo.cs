namespace Casamento.Aplicacao.ModelosCronograma;

public sealed record ModeloCronogramaResumo(
    Guid Id,
    string Nome,
    string? Descricao,
    TimeOnly HorarioReferencia,
    bool Sugerido,
    int QuantidadeItens,
    DateTimeOffset AtualizadoEm);
