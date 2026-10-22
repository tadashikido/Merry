using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public sealed record ParticipacaoFornecedor(
    Guid CasamentoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly DataCasamento,
    bool CasamentoArquivado,
    StatusFornecedorCasamento Status);
