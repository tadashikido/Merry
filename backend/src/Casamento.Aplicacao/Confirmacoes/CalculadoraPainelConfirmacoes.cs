using Casamento.Aplicacao.Convidados;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Confirmacoes;

public static class CalculadoraPainelConfirmacoes
{
    public static PainelConfirmacoesDto Calcular(CasamentoAssessorado casamento, IReadOnlyList<Convite> convites, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(casamento);
        ArgumentNullException.ThrowIfNull(convites);

        var pessoas = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));
        var dataLimite = casamento.DataLimiteRsvpEfetiva();

        return new PainelConfirmacoesDto(
            CalcularSituacao(convites),
            pessoas,
            casamento.ConvidadosEstimados,
            new PrazoRsvpDto(dataLimite, dataLimite.DayNumber - hoje.DayNumber, casamento.AceitaRespostaRsvp(hoje)),
            casamento.Arquivado,
            ListarPendentes(convites));
    }

    public static SituacaoConvitesDto CalcularSituacao(IReadOnlyList<Convite> convites)
    {
        ArgumentNullException.ThrowIfNull(convites);

        return new SituacaoConvitesDto(
            convites.Count,
            convites.Count(convite => convite.StatusEnvio == StatusEnvioConvite.NaoEnviado),
            convites.Count(convite => convite.StatusEnvio == StatusEnvioConvite.Enviado),
            convites.Count(convite => convite.StatusEnvio == StatusEnvioConvite.Visualizado),
            convites.Count(Respondido),
            convites.Count(AguardandoResposta));
    }

    public static bool Respondido(Convite convite)
    {
        ArgumentNullException.ThrowIfNull(convite);
        return convite.Convidados.Count > 0 && convite.Convidados.All(convidado => convidado.Resposta != RespostaRsvp.Pendente);
    }

    public static bool AguardandoResposta(Convite convite)
    {
        ArgumentNullException.ThrowIfNull(convite);
        return convite.Convidados.Any(convidado => convidado.Resposta == RespostaRsvp.Pendente);
    }

    private static List<ConvitePendenteDto> ListarPendentes(IReadOnlyList<Convite> convites)
    {
        return OrdenacaoConvites.Ordenar(convites.Where(AguardandoResposta))
            .Select(ParaPendente)
            .ToList();
    }

    private static ConvitePendenteDto ParaPendente(Convite convite)
    {
        var ordenados = convite.ConvidadosOrdenados();

        return new ConvitePendenteDto(
            convite.Id,
            convite.Nome,
            convite.Grupo,
            convite.StatusEnvio.ToString(),
            ordenados.Select(convidado => convidado.Telefone).FirstOrDefault(telefone => !string.IsNullOrWhiteSpace(telefone)),
            ordenados.Where(convidado => convidado.Resposta == RespostaRsvp.Pendente).Select(convidado => convidado.Nome).ToList(),
            ordenados.Count);
    }
}
