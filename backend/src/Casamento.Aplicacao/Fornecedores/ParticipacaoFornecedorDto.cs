namespace Casamento.Aplicacao.Fornecedores;

public sealed record ParticipacaoFornecedorDto(
    Guid CasamentoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly DataCasamento,
    bool CasamentoArquivado,
    string Status);
