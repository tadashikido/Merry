namespace Celebri.Aplicacao.Cronogramas;

public sealed record ItemCronogramaDto(
    Guid Id,
    string Dia,
    DateOnly Data,
    string Inicio,
    int? DuracaoMinutos,
    string? Termino,
    bool TerminaEmOutroDia,
    string Atividade,
    string? Local,
    string? Responsavel,
    FornecedorItemCronogramaDto? Fornecedor,
    string? Instrucoes,
    string? NotasInternas,
    string Status,
    DateTimeOffset? ConcluidoEm,
    int? MinutosDesdeCerimonia,
    IReadOnlyList<ConflitoItemCronogramaDto> Conflitos,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm);
