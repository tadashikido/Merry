namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record AnaliseImportacao(
    MapeamentoColunas Colunas,
    IReadOnlyList<LinhaImportacao> Linhas,
    IReadOnlyList<ConviteAnalisado> Convites,
    IReadOnlyList<ProblemaLinha> Problemas)
{
    public IReadOnlyList<ConviteAnalisado> ConvitesValidos => Convites.Where(convite => convite.Valido).ToList();

    public bool PossuiConvitesComProblema => Convites.Any(convite => !convite.Valido);
}
