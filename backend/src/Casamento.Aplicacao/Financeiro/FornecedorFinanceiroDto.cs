namespace Casamento.Aplicacao.Financeiro;

public sealed record FornecedorFinanceiroDto(
    Guid FornecedorCasamentoId,
    Guid FornecedorId,
    string NomeEmpresa,
    string Categoria,
    string? Servico,
    string Status,
    decimal ValorContratado,
    decimal Parcelado,
    decimal Pago,
    decimal Pendente,
    decimal Vencido,
    decimal SaldoAParcelar,
    IReadOnlyList<ParcelaDto> Parcelas);
