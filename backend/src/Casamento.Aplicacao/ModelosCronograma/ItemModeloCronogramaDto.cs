namespace Casamento.Aplicacao.ModelosCronograma;

public sealed record ItemModeloCronogramaDto(
    Guid Id,
    int MinutosDesdeCerimonia,
    string Dia,
    string Inicio,
    int? DuracaoMinutos,
    string? Termino,
    bool TerminaEmOutroDia,
    string Atividade,
    string? ReferenciaLocal,
    string? Local,
    string? Responsavel,
    string? CategoriaFornecedor,
    string? Instrucoes);
