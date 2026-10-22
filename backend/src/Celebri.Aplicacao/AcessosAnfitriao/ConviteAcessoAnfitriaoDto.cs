namespace Celebri.Aplicacao.AcessosAnfitriao;

public sealed record ConviteAcessoAnfitriaoDto(
    string Nome,
    string Email,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    string Organizacao,
    DateTimeOffset ExpiraEm);
