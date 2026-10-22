namespace Celebri.Aplicacao.Checklists;

public sealed record ItemModeloChecklistDto(
    Guid Id,
    string Titulo,
    string? Descricao,
    string Responsavel,
    string Categoria,
    int DiasAntesDoEvento);
