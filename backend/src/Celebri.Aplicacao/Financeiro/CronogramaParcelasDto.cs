namespace Casamento.Aplicacao.Financeiro;

public sealed record CronogramaParcelasDto(
    Guid FornecedorCasamentoId,
    decimal ValorContratado,
    decimal Parcelado,
    decimal Pago,
    decimal SaldoAParcelar,
    IReadOnlyList<ParcelaDto> Parcelas);
