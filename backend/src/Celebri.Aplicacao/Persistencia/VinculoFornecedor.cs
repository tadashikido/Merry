using Casamento.Dominio.Fornecedores;

namespace Casamento.Aplicacao.Persistencia;

public sealed record VinculoFornecedor(FornecedorCasamento Vinculo, Fornecedor Fornecedor);
