using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.GrandeDia;

public sealed record GrandeDiaDto(
    Guid EventoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    DateOnly Data,
    string? HorarioCerimonia,
    string? LocalCerimonia,
    string? LocalRecepcao,
    bool Arquivado,
    bool SomenteLeitura,
    MomentoGrandeDiaDto Momento,
    IReadOnlyList<ItemGrandeDiaDto> Itens);

public sealed record MomentoGrandeDiaDto(DateTime Agora, string Fase, int DiasParaOEvento)
{
    public static MomentoGrandeDiaDto De(RetratoGrandeDia retrato, DateTime agoraLocal)
    {
        ArgumentNullException.ThrowIfNull(retrato);

        var agora = new DateTime(
            agoraLocal.Year,
            agoraLocal.Month,
            agoraLocal.Day,
            agoraLocal.Hour,
            agoraLocal.Minute,
            agoraLocal.Second,
            DateTimeKind.Unspecified);

        return new MomentoGrandeDiaDto(agora, retrato.Fase.ToString(), retrato.DiasParaOEvento);
    }
}

public sealed record ItemGrandeDiaDto(
    Guid Id,
    string Dia,
    DateOnly Data,
    string Inicio,
    int? DuracaoMinutos,
    string? Termino,
    bool TerminaEmOutroDia,
    string Atividade,
    string? Local,
    string? Responsavel,
    FornecedorGrandeDiaDto? Fornecedor,
    string? Instrucoes,
    string? NotasInternas,
    string Status,
    DateTimeOffset? ConcluidoEm,
    string Situacao);

public sealed record FornecedorGrandeDiaDto(string NomeEmpresa, string Categoria, string? Contato, string? Telefone);
