namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record FornecedorEventoDto(
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
