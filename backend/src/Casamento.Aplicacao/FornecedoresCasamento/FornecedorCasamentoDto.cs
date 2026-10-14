namespace Casamento.Aplicacao.FornecedoresCasamento;

public sealed record FornecedorCasamentoDto(
    Guid Id,
    FornecedorVinculadoDto Fornecedor,
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    string Status,
    string? NotasInternas,
    ContratoFornecedorDto? Contrato,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm,
    ResumoParcelasVinculoDto? Parcelas = null);
