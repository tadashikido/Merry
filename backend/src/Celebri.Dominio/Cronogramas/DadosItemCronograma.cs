namespace Celebri.Dominio.Cronogramas;

public sealed record DadosItemCronograma(
    DiaCronograma Dia,
    TimeOnly Inicio,
    int? DuracaoMinutos,
    string? Atividade,
    string? Local,
    string? Responsavel,
    Guid? FornecedorEventoId,
    string? Instrucoes,
    string? NotasInternas);
