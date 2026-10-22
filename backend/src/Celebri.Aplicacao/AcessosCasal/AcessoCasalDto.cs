namespace Celebri.Aplicacao.AcessosCasal;

public sealed record AcessoCasalDto(
    Guid Id,
    string Nome,
    string Email,
    string Situacao,
    DateTimeOffset ConvidadoEm,
    DateTimeOffset ConviteExpiraEm,
    DateTimeOffset? AceitoEm);
