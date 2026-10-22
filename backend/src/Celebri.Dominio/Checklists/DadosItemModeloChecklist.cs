using Celebri.Dominio.Tarefas;

namespace Celebri.Dominio.Checklists;

public sealed record DadosItemModeloChecklist(
    string? Titulo,
    string? Descricao,
    ResponsavelTarefa Responsavel,
    CategoriaTarefa Categoria,
    int DiasAntesDoCasamento);
