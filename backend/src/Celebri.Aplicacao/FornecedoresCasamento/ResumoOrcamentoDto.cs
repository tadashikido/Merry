namespace Celebri.Aplicacao.FornecedoresCasamento;

public sealed record ResumoOrcamentoDto(
    IReadOnlyList<ResumoCategoriaOrcamentoDto> Categorias,
    decimal TotalOrcado,
    decimal TotalContratado,
    int QuantidadeFornecedores,
    int QuantidadeContratados,
    decimal TotalPago,
    decimal TotalPendente,
    decimal TotalVencido,
    decimal TotalParcelado);
