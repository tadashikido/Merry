using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Persistencia;

public sealed record ParticipacaoFornecedor(
    Guid EventoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly DataEvento,
    bool EventoArquivado,
    StatusFornecedorEvento Status);
