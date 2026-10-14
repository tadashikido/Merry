namespace Casamento.Aplicacao.Convidados;

public sealed record ConviteDto(
    Guid Id,
    string Nome,
    string? Grupo,
    int LimiteAcompanhantes,
    string StatusEnvio,
    IReadOnlyList<ConvidadoDto> Convidados,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm,
    DateTimeOffset? RespondidoEm);
