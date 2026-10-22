namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record PreVisualizacaoImportacaoDto(
    ResumoImportacaoDto Resumo,
    IReadOnlyList<string> ColunasReconhecidas,
    IReadOnlyList<string> ColunasIgnoradas,
    IReadOnlyList<ConvitePreVisualizadoDto> Convites,
    IReadOnlyList<LinhaComProblemaDto> LinhasComProblema);
