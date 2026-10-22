namespace Casamento.Dominio.Tarefas;

public sealed record DadosTarefa(
    string? Titulo,
    string? Descricao,
    ResponsavelTarefa Responsavel,
    CategoriaTarefa Categoria,
    DateOnly? Prazo);
