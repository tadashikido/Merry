using Celebri.Aplicacao.GrandeDia;

namespace Celebri.Aplicacao.CronogramaPublico;

public sealed record CronogramaPublicoDto(
    CasamentoCronogramaPublicoDto Casamento,
    FiltroCronogramaPublicoDto Filtro,
    IReadOnlyList<ItemCronogramaPublicoDto> Itens,
    DateOnly ValidoAte,
    MomentoGrandeDiaDto Momento);

public sealed record CasamentoCronogramaPublicoDto(
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    string? HorarioCerimonia,
    string? LocalCerimonia,
    string? LocalRecepcao);

public sealed record FiltroCronogramaPublicoDto(string Tipo, string? Rotulo, string? Categoria);

public sealed record ItemCronogramaPublicoDto(
    string Dia,
    DateOnly Data,
    string Inicio,
    int? DuracaoMinutos,
    string? Termino,
    bool TerminaEmOutroDia,
    string Atividade,
    string? Local,
    string? Responsavel,
    FornecedorCronogramaPublicoDto? Fornecedor,
    string? Instrucoes,
    string Status,
    DateTimeOffset? ConcluidoEm,
    string Situacao);

public sealed record FornecedorCronogramaPublicoDto(string NomeEmpresa, string Categoria);
