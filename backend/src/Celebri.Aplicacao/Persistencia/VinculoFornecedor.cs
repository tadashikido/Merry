using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public sealed record VinculoFornecedor(FornecedorEvento Vinculo, Fornecedor Fornecedor);
