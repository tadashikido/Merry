using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public sealed record VinculoFornecedor(FornecedorCasamento Vinculo, Fornecedor Fornecedor);
