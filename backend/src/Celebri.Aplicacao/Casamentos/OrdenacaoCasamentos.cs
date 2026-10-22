using Celebri.Dominio.Casamentos;

namespace Celebri.Aplicacao.Casamentos;

public static class OrdenacaoCasamentos
{
    public static IReadOnlyList<CasamentoAssessorado> OrdenarAtivos(IEnumerable<CasamentoAssessorado> casamentos, DateOnly hoje)
    {
        var lista = casamentos.ToList();

        var proximos = lista
            .Where(casamento => casamento.Data >= hoje)
            .OrderBy(casamento => casamento.Data)
            .ThenBy(casamento => casamento.Horario is null)
            .ThenBy(casamento => casamento.Horario)
            .ThenBy(casamento => casamento.NomePrimeiraPessoa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(casamento => casamento.NomeSegundaPessoa, StringComparer.OrdinalIgnoreCase);

        var realizados = lista
            .Where(casamento => casamento.Data < hoje)
            .OrderByDescending(casamento => casamento.Data)
            .ThenBy(casamento => casamento.Horario is null)
            .ThenByDescending(casamento => casamento.Horario)
            .ThenBy(casamento => casamento.NomePrimeiraPessoa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(casamento => casamento.NomeSegundaPessoa, StringComparer.OrdinalIgnoreCase);

        return [.. proximos, .. realizados];
    }

    public static IReadOnlyList<CasamentoAssessorado> OrdenarArquivados(IEnumerable<CasamentoAssessorado> casamentos)
    {
        return casamentos
            .OrderByDescending(casamento => casamento.ArquivadoEm)
            .ThenBy(casamento => casamento.NomePrimeiraPessoa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(casamento => casamento.NomeSegundaPessoa, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
