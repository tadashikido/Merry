namespace Celebri.Dominio.Casamentos;

public sealed record DadosCasamento(
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    TimeOnly? Horario,
    string? LocalCerimonia,
    string? LocalRecepcao,
    int? ConvidadosEstimados,
    string? Observacoes,
    DateOnly? DataLimiteRsvp = null);
