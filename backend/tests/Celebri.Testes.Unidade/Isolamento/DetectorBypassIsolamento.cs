using System.Text.RegularExpressions;

namespace Celebri.Testes.Unidade.Isolamento;

public enum CategoriaBypass
{
    IgnorarFiltros,
    SqlCru,
    AtualizacaoEmMassa,
    AlteracaoChaveIsolamento,
    TrocaOrganizacao,
}

public sealed record OcorrenciaBypass(CategoriaBypass Categoria, int Linha, string Trecho);

public static partial class DetectorBypassIsolamento
{
    private static readonly (CategoriaBypass Categoria, Regex Padrao)[] Padroes =
    [
        (CategoriaBypass.IgnorarFiltros, IgnorarFiltros()),
        (CategoriaBypass.SqlCru, SqlCru()),
        (CategoriaBypass.AtualizacaoEmMassa, AtualizacaoEmMassa()),
        (CategoriaBypass.AlteracaoChaveIsolamento, SetPropertySobreChaveIsolamento()),
        (CategoriaBypass.AlteracaoChaveIsolamento, SetPropertyPorNomeSobreChaveIsolamento()),
        (CategoriaBypass.TrocaOrganizacao, AssumirEscopoSistema()),
    ];

    public static IReadOnlyList<OcorrenciaBypass> Detectar(string conteudo)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        return Padroes
            .SelectMany(item => item.Padrao.Matches(conteudo)
                .Select(correspondencia => (item.Categoria, Correspondencia: correspondencia)))
            .DistinctBy(item => (item.Categoria, item.Correspondencia.Index))
            .OrderBy(item => item.Correspondencia.Index)
            .Select(item => new OcorrenciaBypass(
                item.Categoria,
                NumeroLinha(conteudo, item.Correspondencia.Index),
                item.Correspondencia.Value))
            .ToList();
    }

    private static int NumeroLinha(string conteudo, int indice)
    {
        var linha = 1;

        for (var posicao = 0; posicao < indice; posicao++)
        {
            if (conteudo[posicao] == '\n')
            {
                linha++;
            }
        }

        return linha;
    }

    [GeneratedRegex(@"\bIgnoreQueryFilters\b")]
    private static partial Regex IgnorarFiltros();

    [GeneratedRegex(@"\b(FromSql\w*|ExecuteSql\w*|SqlQuery\w*|GetDbConnection|CreateCommand|DbCommand|NpgsqlCommand|NpgsqlBatch|NpgsqlConnection|NpgsqlDataSource)\b")]
    private static partial Regex SqlCru();

    [GeneratedRegex(@"\b(ExecuteUpdate|ExecuteDelete)(Async)?\b")]
    private static partial Regex AtualizacaoEmMassa();

    [GeneratedRegex(@"\bSetProperty\s*(<[^>]*>)?\s*\(\s*[^,]*?\b(OrganizacaoId|EventoId)\b", RegexOptions.Singleline)]
    private static partial Regex SetPropertySobreChaveIsolamento();

    [GeneratedRegex(@"\bSetProperty\s*(<[^>]*>)?\s*\(\s*\w+\s*=>\s*EF\s*\.\s*Property\s*<[^>]*>\s*\([^,]*,\s*[^)]*?\b(OrganizacaoId|EventoId|PropriedadeEvento)\b", RegexOptions.Singleline)]
    private static partial Regex SetPropertyPorNomeSobreChaveIsolamento();

    [GeneratedRegex(@"\.\s*Assumir\b")]
    private static partial Regex AssumirEscopoSistema();
}
