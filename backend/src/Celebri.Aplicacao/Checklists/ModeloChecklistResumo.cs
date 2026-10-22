using Celebri.Dominio.Eventos;

namespace Celebri.Aplicacao.Checklists;

public sealed record ModeloChecklistResumo(
    Guid Id,
    string Nome,
    string? Descricao,
    bool Sugerido,
    int QuantidadeItens,
    DateTimeOffset AtualizadoEm,
    TipoEvento? TipoEvento);
