using Celebri.Dominio.Financeiro;

namespace Celebri.Aplicacao.Financeiro;

public static class CalculadoraAlertasPagamentos
{
    public static TotaisAlertasDto Calcular(IEnumerable<ParcelaFornecedor> parcelasConsideradas, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(parcelasConsideradas);

        var lista = parcelasConsideradas.ToList();
        var vencidas = lista.Where(parcela => parcela.Situacao(hoje) == SituacaoParcela.Vencida).ToList();
        var proximas = lista.Where(parcela => parcela.VenceEmBreve(hoje)).ToList();

        return new TotaisAlertasDto(
            vencidas.Count,
            vencidas.Sum(parcela => parcela.Valor),
            proximas.Count,
            proximas.Sum(parcela => parcela.Valor));
    }
}
