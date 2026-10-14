namespace Casamento.Aplicacao.AcessosCasal;

public sealed record ConviteAcessoCasalDto(
    string Nome,
    string Email,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    string Organizacao,
    DateTimeOffset ExpiraEm);
