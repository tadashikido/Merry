namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record ValoresLinhaImportacaoDto(
    string Convite,
    string Grupo,
    string Nome,
    string Telefone,
    string Email,
    string FaixaEtaria,
    string Acompanhantes,
    string Resposta);
