namespace Celebri.Aplicacao.Fornecedores;

public sealed record ParticipacaoFornecedorDto(
    Guid EventoId,
    string NomePrimeiraPessoa,
    string? NomeSegundaPessoa,
    DateOnly DataEvento,
    bool EventoArquivado,
    string Status);
