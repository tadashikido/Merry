namespace Casamento.Dominio.Financeiro;

public sealed record DadosParcela(decimal Valor, DateOnly Vencimento, string? Observacao);
