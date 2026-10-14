namespace Casamento.Aplicacao.Tarefas;

public sealed record TarefaDto(
    Guid Id,
    string Titulo,
    string? Descricao,
    string Responsavel,
    string Categoria,
    string Status,
    DateOnly? Prazo,
    bool Atrasada,
    bool VenceNaSemana,
    int? DiasParaPrazo,
    DateTimeOffset? ConcluidaEm,
    string? ConcluidaPor,
    bool GeradaDeModelo,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm);
