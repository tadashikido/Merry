using Casamento.Dominio.Tarefas;

namespace Casamento.Dominio.Checklists;

public sealed record DadosItemModeloChecklist(
    string? Titulo,
    string? Descricao,
    ResponsavelTarefa Responsavel,
    CategoriaTarefa Categoria,
    int DiasAntesDoCasamento);
