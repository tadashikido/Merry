namespace Casamento.Aplicacao.Casamentos;

public sealed record CasamentoDto(
    Guid Id,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    string? Horario,
    string? LocalCerimonia,
    string? LocalRecepcao,
    int? ConvidadosEstimados,
    string? Observacoes,
    string Fase,
    int DiasRestantes,
    bool Arquivado,
    DateTimeOffset? ArquivadoEm,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm,
    DateOnly? DataLimiteRsvp,
    DateOnly DataLimiteRsvpEfetiva,
    int? PercentualChecklist = null);
