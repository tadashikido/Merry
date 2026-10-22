namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record LinhaImportacao(int Numero, IReadOnlyDictionary<ColunaImportacao, string?> Valores)
{
    public string? Valor(ColunaImportacao coluna)
    {
        return Valores.TryGetValue(coluna, out var valor) ? valor : null;
    }
}
