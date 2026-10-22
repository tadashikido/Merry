namespace Celebri.Aplicacao.Mesas;

public sealed record MapaMesasDto(
    IReadOnlyList<MesaDto> Mesas,
    IReadOnlyList<PessoaMesaDto> Pessoas,
    IReadOnlyList<AvisoSaidaMesaDto> AvisosSaida,
    TotaisMesasDto Totais,
    bool EventoArquivado);
