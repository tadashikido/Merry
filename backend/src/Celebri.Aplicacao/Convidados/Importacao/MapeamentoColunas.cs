namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record MapeamentoColunas(
    IReadOnlyDictionary<ColunaImportacao, int> Indices,
    IReadOnlyList<ColunaImportacao> Reconhecidas,
    IReadOnlyList<string> Ignoradas);
