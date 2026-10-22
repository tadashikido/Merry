namespace Celebri.Dominio.Fornecedores;

public sealed record DadosFornecedorEvento(
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    StatusFornecedorEvento Status,
    string? NotasInternas);
