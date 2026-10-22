namespace Celebri.Dominio.Convidados;

public sealed record DadosConvite(
    string? Nome,
    string? Grupo,
    int LimiteAcompanhantes,
    IReadOnlyList<DadosConvidado> Convidados);
