namespace Celebri.Aplicacao.AcessosAnfitriao;

public sealed record AcessoAnfitriaoDto(
    Guid Id,
    string Nome,
    string Email,
    string Situacao,
    DateTimeOffset ConvidadoEm,
    DateTimeOffset ConviteExpiraEm,
    DateTimeOffset? AceitoEm);
