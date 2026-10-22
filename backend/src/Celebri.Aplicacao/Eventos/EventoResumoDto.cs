namespace Celebri.Aplicacao.Eventos;

public sealed record EventoResumoDto(
    Guid Id,
    string NomePrimeiraPessoa,
    string? NomeSegundaPessoa,
    DateOnly Data,
    string? Horario,
    string? LocalCerimonia,
    int? ConvidadosEstimados,
    string Fase,
    int DiasRestantes,
    bool Arquivado,
    string Tipo);
