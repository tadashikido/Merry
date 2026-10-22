using Casamento.Dominio.DadosSensiveis;

namespace Casamento.Dominio.Convidados;

public sealed record DadosAcompanhanteRsvp(Guid? Id, string? Nome, FaixaEtaria FaixaEtaria, AlteracaoDadosSensiveis? DadosSensiveis = null);
