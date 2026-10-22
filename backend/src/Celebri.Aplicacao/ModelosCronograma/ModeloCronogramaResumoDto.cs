namespace Celebri.Aplicacao.ModelosCronograma;

public sealed record ModeloCronogramaResumoDto(
    Guid Id,
    string Nome,
    string? Descricao,
    string HorarioReferencia,
    bool Sugerido,
    int QuantidadeItens,
    DateTimeOffset AtualizadoEm,
    string? TipoEvento);
