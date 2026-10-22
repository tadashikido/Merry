using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Dominio.Convidados;

public sealed record DadosAcompanhanteRsvp(Guid? Id, string? Nome, FaixaEtaria FaixaEtaria, AlteracaoDadosSensiveis? DadosSensiveis = null);
