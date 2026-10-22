namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record ResumoParcelasVinculoDto(
    int Quantidade,
    int Pagas,
    int Vencidas,
    decimal Parcelado,
    decimal Pago,
    decimal SaldoAParcelar,
    DateOnly? ProximoVencimento,
    decimal? ProximoValor);
