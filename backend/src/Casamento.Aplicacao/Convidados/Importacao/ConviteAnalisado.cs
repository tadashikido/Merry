namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record ConviteAnalisado(
    string? Nome,
    string NomeExibicao,
    string? Grupo,
    int LimiteAcompanhantes,
    IReadOnlyList<PessoaAnalisada> Pessoas,
    bool Valido);
