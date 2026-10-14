using System.Globalization;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Convidados.Importacao;

public static class InterpretadorValoresImportacao
{
    private static readonly IReadOnlyDictionary<string, FaixaEtaria> Faixas = new Dictionary<string, FaixaEtaria>(StringComparer.Ordinal)
    {
        ["adulto"] = FaixaEtaria.Adulto,
        ["adulta"] = FaixaEtaria.Adulto,
        ["a"] = FaixaEtaria.Adulto,
        ["crianca"] = FaixaEtaria.Crianca,
        ["c"] = FaixaEtaria.Crianca,
    };

    private static readonly IReadOnlyDictionary<string, RespostaRsvp> Respostas = new Dictionary<string, RespostaRsvp>(StringComparer.Ordinal)
    {
        ["pendente"] = RespostaRsvp.Pendente,
        ["confirmado"] = RespostaRsvp.Confirmado,
        ["confirmada"] = RespostaRsvp.Confirmado,
        ["sim"] = RespostaRsvp.Confirmado,
        ["s"] = RespostaRsvp.Confirmado,
        ["recusado"] = RespostaRsvp.Recusado,
        ["recusada"] = RespostaRsvp.Recusado,
        ["nao"] = RespostaRsvp.Recusado,
        ["n"] = RespostaRsvp.Recusado,
    };

    public static bool TentarFaixaEtaria(string? valor, out FaixaEtaria faixa)
    {
        var chave = ChaveComparacaoConvidado.Texto(valor);

        if (chave is null)
        {
            faixa = FaixaEtaria.Adulto;
            return true;
        }

        return Faixas.TryGetValue(chave, out faixa);
    }

    public static bool TentarResposta(string? valor, out RespostaRsvp resposta)
    {
        var chave = ChaveComparacaoConvidado.Texto(valor);

        if (chave is null)
        {
            resposta = RespostaRsvp.Pendente;
            return true;
        }

        return Respostas.TryGetValue(chave, out resposta);
    }

    public static bool TentarAcompanhantes(string? valor, out int acompanhantes)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            acompanhantes = Convite.LimiteAcompanhantesMinimo;
            return true;
        }

        return int.TryParse(valor.Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out acompanhantes)
            && acompanhantes is >= Convite.LimiteAcompanhantesMinimo and <= Convite.LimiteAcompanhantesMaximo;
    }
}
