namespace Celebri.Dominio.Cronogramas;

public sealed record RetratoGrandeDia(
    FaseGrandeDia Fase,
    int MinutoAtual,
    int DiasParaOEvento,
    IReadOnlyDictionary<Guid, SituacaoItemGrandeDia> Situacoes)
{
    public SituacaoItemGrandeDia SituacaoDe(ItemCronograma item)
    {
        ArgumentNullException.ThrowIfNull(item);
        return Situacoes.TryGetValue(item.Id, out var situacao) ? situacao : SituacaoItemGrandeDia.Depois;
    }
}
