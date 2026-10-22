using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public static class CalculadoraTotaisConvidados
{
    public static ResumoConvidados Resumir(IEnumerable<Convite> convites)
    {
        ArgumentNullException.ThrowIfNull(convites);

        var lista = convites.ToList();
        var contagens = lista
            .SelectMany(convite => convite.Convidados)
            .GroupBy(convidado => (convidado.FaixaEtaria, convidado.Resposta))
            .Select(grupo => new ContagemConvidados(grupo.Key.FaixaEtaria, grupo.Key.Resposta, grupo.Count()))
            .ToList();

        return new ResumoConvidados(contagens, lista.Count, lista.Sum(convite => Math.Max(0, convite.LimiteAcompanhantes - convite.QuantidadeAcompanhantes())));
    }

    public static TotaisConvidadosDto Calcular(ResumoConvidados resumo)
    {
        ArgumentNullException.ThrowIfNull(resumo);

        var pendentes = PorResposta(resumo, RespostaRsvp.Pendente);
        var confirmados = PorResposta(resumo, RespostaRsvp.Confirmado);
        var recusados = PorResposta(resumo, RespostaRsvp.Recusado);
        var adultos = pendentes.Adultos + confirmados.Adultos + recusados.Adultos;
        var criancas = pendentes.Criancas + confirmados.Criancas + recusados.Criancas;

        return new TotaisConvidadosDto(
            resumo.Convites,
            adultos + criancas,
            adultos,
            criancas,
            resumo.AcompanhantesPermitidos,
            pendentes,
            confirmados,
            recusados);
    }

    private static TotaisPorFaixaDto PorResposta(ResumoConvidados resumo, RespostaRsvp resposta)
    {
        var adultos = Somar(resumo, resposta, FaixaEtaria.Adulto);
        var criancas = Somar(resumo, resposta, FaixaEtaria.Crianca);
        return new TotaisPorFaixaDto(adultos, criancas, adultos + criancas);
    }

    private static int Somar(ResumoConvidados resumo, RespostaRsvp resposta, FaixaEtaria faixaEtaria)
    {
        return resumo.Contagens
            .Where(contagem => contagem.Resposta == resposta && contagem.FaixaEtaria == faixaEtaria)
            .Sum(contagem => contagem.Quantidade);
    }
}
