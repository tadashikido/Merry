namespace Celebri.Dominio.Eventos;

public sealed record DadosEvento(
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    TimeOnly? Horario,
    string? LocalCerimonia,
    string? LocalRecepcao,
    int? ConvidadosEstimados,
    string? Observacoes,
    DateOnly? DataLimiteRsvp = null);
