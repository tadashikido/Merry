using Casamento.Dominio.DadosSensiveis;

namespace Casamento.Dominio.Convidados;

public sealed record RespostaPessoaRsvp(Guid ConvidadoId, RespostaRsvp Resposta, AlteracaoDadosSensiveis? DadosSensiveis = null);
