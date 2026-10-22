namespace Celebri.Aplicacao.Checklists;

public sealed record ModeloChecklistDto(
    Guid Id,
    string Nome,
    string? Descricao,
    bool Sugerido,
    IReadOnlyList<ItemModeloChecklistDto> Itens,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm,
    string? TipoEvento);
