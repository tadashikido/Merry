using Celebri.Dominio.Fornecedores;

namespace Celebri.Dominio.Eventos;

public sealed record VinculoParaDuplicar(FornecedorEvento Vinculo, bool FornecedorArquivado);
