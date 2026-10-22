namespace Celebri.Aplicacao.Rsvp;

public sealed record EventoRsvpDto(
    string NomePrimeiraPessoa,
    string? NomeSegundaPessoa,
    DateOnly Data,
    string? Horario,
    string? LocalCerimonia,
    string? LocalRecepcao,
    string Tipo);
