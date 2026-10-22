using Casamento.Dominio.Fornecedores;

namespace Casamento.Aplicacao.Persistencia;

public sealed record ParticipacaoFornecedor(
    Guid CasamentoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly DataCasamento,
    bool CasamentoArquivado,
    StatusFornecedorCasamento Status);
