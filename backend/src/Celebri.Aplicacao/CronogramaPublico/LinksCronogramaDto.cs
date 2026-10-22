namespace Celebri.Aplicacao.CronogramaPublico;

public sealed record LinkCronogramaDto(Guid Id, string? Token, DateTimeOffset GeradoEm);

public sealed record DestinoLinkCronogramaDto(
    string Tipo,
    Guid? FornecedorEventoId,
    string? Responsavel,
    string? Rotulo,
    string? Categoria,
    string? Telefone,
    bool Cancelado,
    int QuantidadeItens,
    LinkCronogramaDto? Link);

public sealed record LinksCronogramaDto(
    DateOnly ValidoAte,
    bool Expirado,
    bool Arquivado,
    IReadOnlyList<DestinoLinkCronogramaDto> Destinos);
