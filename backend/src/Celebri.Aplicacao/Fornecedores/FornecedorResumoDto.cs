namespace Celebri.Aplicacao.Fornecedores;

public sealed record FornecedorResumoDto(
    Guid Id,
    string Categoria,
    string NomeEmpresa,
    string? Responsavel,
    string? Telefone,
    string? Email,
    string? Site,
    string? Instagram,
    bool Arquivado,
    DateTimeOffset AtualizadoEm);
