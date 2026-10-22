namespace Celebri.Aplicacao.Persistencia;

public sealed record AlertasParcelas(
    int TotalVencidas,
    decimal ValorVencidas,
    int TotalProximas,
    decimal ValorProximas,
    int CasamentosComVencidas,
    IReadOnlyList<ParcelaAlerta> Vencidas,
    IReadOnlyList<ParcelaAlerta> Proximas);
