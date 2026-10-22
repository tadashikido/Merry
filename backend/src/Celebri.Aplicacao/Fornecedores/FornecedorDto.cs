namespace Casamento.Aplicacao.Fornecedores;

public sealed record FornecedorDto(
    Guid Id,
    string Categoria,
    string NomeEmpresa,
    string? Responsavel,
    string? Telefone,
    string? Email,
    string? Site,
    string? Instagram,
    string? Observacoes,
    bool Arquivado,
    DateTimeOffset? ArquivadoEm,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm);
