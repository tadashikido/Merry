namespace Celebri.Dominio.Fornecedores;

public sealed record DadosFornecedorCasamento(
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    StatusFornecedorCasamento Status,
    string? NotasInternas);
