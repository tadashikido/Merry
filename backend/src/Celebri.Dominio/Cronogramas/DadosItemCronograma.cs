namespace Casamento.Dominio.Cronogramas;

public sealed record DadosItemCronograma(
    DiaCronograma Dia,
    TimeOnly Inicio,
    int? DuracaoMinutos,
    string? Atividade,
    string? Local,
    string? Responsavel,
    Guid? FornecedorCasamentoId,
    string? Instrucoes,
    string? NotasInternas);
