namespace Celebri.Aplicacao.ModelosCronograma;

public sealed record ModeloCronogramaDto(
    Guid Id,
    string Nome,
    string? Descricao,
    string HorarioReferencia,
    bool Sugerido,
    IReadOnlyList<ItemModeloCronogramaDto> Itens,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm,
    string? TipoEvento);
