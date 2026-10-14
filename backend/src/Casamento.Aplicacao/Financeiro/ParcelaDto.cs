namespace Casamento.Aplicacao.Financeiro;

public sealed record ParcelaDto(
    Guid Id,
    Guid FornecedorCasamentoId,
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
