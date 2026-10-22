namespace Celebri.Aplicacao.Financeiro;

public sealed record AlertasPagamentosDto(
    int TotalVencidas,
    decimal ValorVencidas,
    int TotalProximas,
    decimal ValorProximas,
    int EventosComVencidas,
    DateOnly Hoje,
    IReadOnlyList<ParcelaAlertaDto> Vencidas,
    IReadOnlyList<ParcelaAlertaDto> Proximas);
