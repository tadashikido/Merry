using Casamento.Aplicacao.Mesas;

namespace Casamento.Aplicacao.Convidados;

public sealed record ListaConvitesDto(
    IReadOnlyList<ConviteDto> Convites,
    TotaisConvidadosDto Totais,
    int? ConvidadosEstimados,
    bool CasamentoArquivado,
    IReadOnlyList<MesaResumoDto> Mesas);
