using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Convidados.Importacao;

public static class MapeadorColunasImportacao
{
    private static readonly IReadOnlyDictionary<string, ColunaImportacao> Sinonimos = new Dictionary<string, ColunaImportacao>(StringComparer.Ordinal)
    {
        ["convite"] = ColunaImportacao.Convite,
        ["familia"] = ColunaImportacao.Convite,
        ["convitefamilia"] = ColunaImportacao.Convite,
        ["conviteefamilia"] = ColunaImportacao.Convite,
        ["familiaconvite"] = ColunaImportacao.Convite,
        ["grupofamiliar"] = ColunaImportacao.Convite,
        ["grupo"] = ColunaImportacao.Grupo,
        ["lado"] = ColunaImportacao.Grupo,
        ["categoria"] = ColunaImportacao.Grupo,
        ["nome"] = ColunaImportacao.Nome,
        ["nomecompleto"] = ColunaImportacao.Nome,
        ["convidado"] = ColunaImportacao.Nome,
        ["pessoa"] = ColunaImportacao.Nome,
        ["telefone"] = ColunaImportacao.Telefone,
        ["celular"] = ColunaImportacao.Telefone,
        ["whatsapp"] = ColunaImportacao.Telefone,
        ["fone"] = ColunaImportacao.Telefone,
        ["tel"] = ColunaImportacao.Telefone,
        ["email"] = ColunaImportacao.Email,
        ["faixaetaria"] = ColunaImportacao.FaixaEtaria,
        ["idade"] = ColunaImportacao.FaixaEtaria,
        ["faixa"] = ColunaImportacao.FaixaEtaria,
        ["adultooucrianca"] = ColunaImportacao.FaixaEtaria,
        ["acompanhantes"] = ColunaImportacao.Acompanhantes,
        ["acompanhante"] = ColunaImportacao.Acompanhantes,
        ["limiteacompanhantes"] = ColunaImportacao.Acompanhantes,
        ["resposta"] = ColunaImportacao.Resposta,
        ["rsvp"] = ColunaImportacao.Resposta,
        ["confirmacao"] = ColunaImportacao.Resposta,
        ["presenca"] = ColunaImportacao.Resposta,
    };

    public static MapeamentoColunas Mapear(IReadOnlyList<string> cabecalho)
    {
        ArgumentNullException.ThrowIfNull(cabecalho);

        var indices = new Dictionary<ColunaImportacao, int>();
        var reconhecidas = new List<ColunaImportacao>();
        var ignoradas = new List<string>();

        for (var indice = 0; indice < cabecalho.Count; indice++)
        {
            var original = cabecalho[indice].Trim().TrimStart('\uFEFF');

            if (original.Length == 0)
            {
                continue;
            }

            if (Sinonimos.TryGetValue(ChaveComparacaoConvidado.Cabecalho(original), out var coluna) && indices.TryAdd(coluna, indice))
            {
                reconhecidas.Add(coluna);
                continue;
            }

            ignoradas.Add(original.Length > LimitesImportacao.TamanhoMaximoNomeColunaIgnorada
                ? original[..LimitesImportacao.TamanhoMaximoNomeColunaIgnorada]
                : original);
        }

        if (!indices.ContainsKey(ColunaImportacao.Nome))
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ColunaNomeAusente);
        }

        return new MapeamentoColunas(indices, reconhecidas, ignoradas);
    }

    public static LinhaImportacao Aplicar(MapeamentoColunas mapeamento, LinhaPlanilha linha)
    {
        ArgumentNullException.ThrowIfNull(mapeamento);
        ArgumentNullException.ThrowIfNull(linha);

        var valores = new Dictionary<ColunaImportacao, string?>();

        foreach (var (coluna, indice) in mapeamento.Indices)
        {
            var valor = indice < linha.Celulas.Count ? linha.Celulas[indice].Trim() : null;
            valores[coluna] = string.IsNullOrEmpty(valor) ? null : valor;
        }

        return new LinhaImportacao(linha.Numero, valores);
    }
}
