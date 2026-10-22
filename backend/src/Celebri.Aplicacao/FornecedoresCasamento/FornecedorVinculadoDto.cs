namespace Celebri.Aplicacao.FornecedoresCasamento;

public sealed record FornecedorVinculadoDto(
    Guid Id,
    string Categoria,
    string NomeEmpresa,
    string? Responsavel,
    string? Telefone,
    string? Email,
    string? Site,
    string? Instagram,
    bool Arquivado);
