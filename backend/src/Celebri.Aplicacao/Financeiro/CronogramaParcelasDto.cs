namespace Celebri.Aplicacao.Financeiro;

public sealed record CronogramaParcelasDto(
    Guid FornecedorEventoId,
    decimal ValorContratado,
    decimal Parcelado,
    decimal Pago,
    decimal SaldoAParcelar,
    IReadOnlyList<ParcelaDto> Parcelas);
