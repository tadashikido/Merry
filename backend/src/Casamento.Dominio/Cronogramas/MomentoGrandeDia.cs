namespace Casamento.Dominio.Cronogramas;

public static class MomentoGrandeDia
{
    public static RetratoGrandeDia Calcular(
        IReadOnlyList<ItemCronograma> itensOrdenados,
        DateOnly dataCasamento,
        DateTime agoraLocal)
    {
        ArgumentNullException.ThrowIfNull(itensOrdenados);

        var dataAgora = DateOnly.FromDateTime(agoraLocal);
        var minutoAtual = ((dataAgora.DayNumber - dataCasamento.DayNumber) * ItemCronograma.MinutosPorDia)
            + (agoraLocal.Hour * 60)
            + agoraLocal.Minute;
        var inicioJanela = InicioJanela(itensOrdenados);
        var fimJanela = FimJanela(itensOrdenados);
        var fase = minutoAtual < inicioJanela
            ? FaseGrandeDia.AntesDoDia
            : minutoAtual >= fimJanela ? FaseGrandeDia.DepoisDoDia : FaseGrandeDia.NoDia;

        var situacoes = new Dictionary<Guid, SituacaoItemGrandeDia>(itensOrdenados.Count);
        var proximoDefinido = false;

        for (var indice = 0; indice < itensOrdenados.Count; indice++)
        {
            var item = itensOrdenados[indice];

            if (item.Status == StatusItemCronograma.Concluido)
            {
                situacoes[item.Id] = SituacaoItemGrandeDia.Feito;
                continue;
            }

            if (fase == FaseGrandeDia.AntesDoDia)
            {
                situacoes[item.Id] = SituacaoItemGrandeDia.Depois;
                continue;
            }

            if (fase == FaseGrandeDia.DepoisDoDia)
            {
                situacoes[item.Id] = SituacaoItemGrandeDia.SemMarcar;
                continue;
            }

            var fim = FimEfetivo(itensOrdenados, indice, fimJanela);

            if (item.MinutoInicial <= minutoAtual)
            {
                situacoes[item.Id] = minutoAtual < fim ? SituacaoItemGrandeDia.Agora : SituacaoItemGrandeDia.SemMarcar;
                continue;
            }

            situacoes[item.Id] = proximoDefinido ? SituacaoItemGrandeDia.Depois : SituacaoItemGrandeDia.Proximo;
            proximoDefinido = true;
        }

        return new RetratoGrandeDia(fase, minutoAtual, dataCasamento.DayNumber - dataAgora.DayNumber, situacoes);
    }

    public static int InicioJanela(IReadOnlyList<ItemCronograma> itensOrdenados)
    {
        ArgumentNullException.ThrowIfNull(itensOrdenados);

        if (itensOrdenados.Count == 0)
        {
            return 0;
        }

        var primeiro = itensOrdenados.Min(item => item.MinutoInicial);
        return Math.Min(0, InicioDoDia(primeiro));
    }

    public static int FimJanela(IReadOnlyList<ItemCronograma> itensOrdenados)
    {
        ArgumentNullException.ThrowIfNull(itensOrdenados);

        if (itensOrdenados.Count == 0)
        {
            return ItemCronograma.MinutosPorDia;
        }

        var ultimo = itensOrdenados.Max(item => item.DuracaoMinutos.HasValue ? item.MinutoFinal : item.MinutoInicial);
        return Math.Max(ItemCronograma.MinutosPorDia, InicioDoDia(ultimo - 1) + ItemCronograma.MinutosPorDia);
    }

    private static int FimEfetivo(IReadOnlyList<ItemCronograma> itensOrdenados, int indice, int fimJanela)
    {
        var item = itensOrdenados[indice];

        if (item.DuracaoMinutos.HasValue)
        {
            return item.MinutoFinal;
        }

        for (var seguinte = indice + 1; seguinte < itensOrdenados.Count; seguinte++)
        {
            if (itensOrdenados[seguinte].MinutoInicial > item.MinutoInicial)
            {
                return itensOrdenados[seguinte].MinutoInicial;
            }
        }

        return fimJanela;
    }

    private static int InicioDoDia(int minutoAbsoluto)
    {
        return (int)Math.Floor(minutoAbsoluto / (double)ItemCronograma.MinutosPorDia) * ItemCronograma.MinutosPorDia;
    }
}
