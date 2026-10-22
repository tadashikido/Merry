namespace Celebri.Aplicacao.ModelosCronograma;

public sealed record AplicacaoModeloCronogramaDto(
    int ItensNoModelo,
    int ItensCriados,
    int JaAplicados,
    int FornecedoresPreenchidos,
    int ItensAjustados,
    int ItensNoCronograma,
    bool ExcedeLimite,
    bool SemHorarioCerimonia,
    string? HorarioCerimonia,
    ItemPrevistoCronogramaDto? PrimeiroItem,
    ItemPrevistoCronogramaDto? UltimoItem);
