namespace Casamento.Dominio.Fornecedores;

public sealed record DadosFornecedor(
    CategoriaFornecedor Categoria,
    string? NomeEmpresa,
    string? Responsavel,
    string? Telefone,
    string? Email,
    string? Site,
    string? Instagram,
    string? Observacoes);
