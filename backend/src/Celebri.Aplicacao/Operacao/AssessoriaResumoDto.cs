namespace Celebri.Aplicacao.Operacao;

public sealed record AssessoriaResumoDto(
    Guid Id,
    string Nome,
    DateTimeOffset CriadaEm,
    int TotalEventos,
    DateTimeOffset? UltimoLoginEm,
    bool Suspensa);

public sealed record DashboardOperacaoDto(
    int TotalAssessorias,
    int Ativas30Dias,
    int TotalEventos,
    int NovasNoPeriodo);
