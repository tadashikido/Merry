namespace Casamento.Aplicacao.Rsvp;

public sealed record PessoaRsvpDto(Guid Id, string Nome, string FaixaEtaria, string Resposta, bool PossuiRestricao);
