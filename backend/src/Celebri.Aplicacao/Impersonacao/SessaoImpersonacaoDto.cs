namespace Celebri.Aplicacao.Impersonacao;

public sealed record AssessoriaImpersonadaDto(Guid Id, string Nome);

public sealed record SessaoImpersonacaoDto(Guid SessaoId, string TokenAcesso, DateTimeOffset ExpiraEm, AssessoriaImpersonadaDto Assessoria);

public sealed record SessaoImpersonacaoResumoDto(
    Guid SessaoId,
    Guid OrganizacaoId,
    string NomeAssessoria,
    string Motivo,
    DateTimeOffset IniciadaEm,
    DateTimeOffset? EncerradaEm,
    DateTimeOffset ExpiraEm,
    bool Ativa);
