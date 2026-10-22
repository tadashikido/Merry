using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Dominio.Convidados;

public sealed record RespostaPessoaRsvp(Guid ConvidadoId, RespostaRsvp Resposta, AlteracaoDadosSensiveis? DadosSensiveis = null);
