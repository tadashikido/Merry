using Casamento.Aplicacao.Convidados;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Confirmacoes;

public static class CalculadoraPainelConfirmacoes
{
    public static PainelConfirmacoesDto Calcular(CasamentoAssessorado casamento, IReadOnlyList<Convite> convites, DateOnly hoje)
    {
        return Calcular(casamento, convites, hoje, new HashSet<Guid>());
    }

    public static PainelConfirmacoesDto Calcular(
        CasamentoAssessorado casamento,
        IReadOnlyList<Convite> convites,
        DateOnly hoje,
        IReadOnlySet<Guid> convitesComLink)
    {
        ArgumentNullException.ThrowIfNull(casamento);
        ArgumentNullException.ThrowIfNull(convites);
        ArgumentNullException.ThrowIfNull(convitesComLink);

        var pessoas = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));
        var dataLimite = casamento.DataLimiteRsvpEfetiva();
        var aceitaRespostas = casamento.AceitaRespostaRsvp(hoje);

        return new PainelConfirmacoesDto(
            CalcularSituacao(convites),
            pessoas,
            casamento.ConvidadosEstimados,
            new PrazoRsvpDto(dataLimite, dataLimite.DayNumber - hoje.DayNumber, aceitaRespostas),
            casamento.Arquivado,
            ListarPendentes(convites, convite => aceitaRespostas && Cobravel(convite, convitesComLink)));
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

    public static bool Cobravel(Convite convite, IReadOnlySet<Guid> convitesComLink)
    {
        ArgumentNullException.ThrowIfNull(convite);
        ArgumentNullException.ThrowIfNull(convitesComLink);
        return convite.PodeSerCobrado() && convitesComLink.Contains(convite.Id);
    }

    private static List<ConvitePendenteDto> ListarPendentes(IReadOnlyList<Convite> convites, Func<Convite, bool> cobravel)
    {
        return OrdenacaoConvites.Ordenar(convites.Where(AguardandoResposta))
            .Select(convite => ParaPendente(convite, cobravel(convite)))
            .ToList();
    }

    private static ConvitePendenteDto ParaPendente(Convite convite, bool cobravel)
    {
        var ordenados = convite.ConvidadosOrdenados();

        return new ConvitePendenteDto(
            convite.Id,
            convite.Nome,
            convite.Grupo,
            convite.StatusEnvio.ToString(),
            ordenados.Select(convidado => convidado.Telefone).FirstOrDefault(telefone => !string.IsNullOrWhiteSpace(telefone)),
            ordenados.Where(convidado => convidado.Resposta == RespostaRsvp.Pendente).Select(convidado => convidado.Nome).ToList(),
            ordenados.Count,
            cobravel,
            convite.UltimaCobrancaEm,
            convite.QuantidadeCobrancas);
    }
}
