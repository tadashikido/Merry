namespace Celebri.Aplicacao.Rsvp;

public sealed record CasamentoRsvpDto(
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    string? Horario,
    string? LocalCerimonia,
    string? LocalRecepcao);
