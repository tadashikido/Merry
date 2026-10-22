namespace Celebri.Aplicacao.Casamentos;

public sealed record CasamentoResumoDto(
    Guid Id,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    string? Horario,
    string? LocalCerimonia,
    int? ConvidadosEstimados,
    string Fase,
    int DiasRestantes,
    bool Arquivado);
