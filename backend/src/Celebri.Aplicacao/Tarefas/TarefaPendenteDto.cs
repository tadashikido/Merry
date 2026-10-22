namespace Casamento.Aplicacao.Tarefas;

public sealed record TarefaPendenteDto(
    Guid Id,
    Guid CasamentoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    string Titulo,
    string Responsavel,
    string Categoria,
    string Status,
    DateOnly Prazo,
    int DiasParaPrazo);
