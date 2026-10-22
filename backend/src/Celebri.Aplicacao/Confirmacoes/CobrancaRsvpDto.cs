namespace Celebri.Aplicacao.Confirmacoes;

public sealed record CobrancaRsvpDto(Guid ConviteId, DateTimeOffset UltimaCobrancaEm, int QuantidadeCobrancas);
