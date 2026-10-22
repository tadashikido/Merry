namespace Celebri.Aplicacao.Financeiro;

public sealed record ParcelaDto(
    Guid Id,
    Guid FornecedorEventoId,
    int Numero,
    int TotalParcelas,
    decimal Valor,
    DateOnly Vencimento,
    string? Observacao,
    string Situacao,
    int DiasParaVencimento,
    bool VenceEmBreve,
    DateOnly? PagaEm,
    ComprovanteParcelaDto? Comprovante,
    DateTimeOffset AtualizadoEm);
