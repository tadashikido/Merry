namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record ListaFornecedoresEventoDto(
    IReadOnlyList<FornecedorEventoDto> Vinculos,
    ResumoOrcamentoDto Resumo,
    bool EventoArquivado,
    bool SomenteLeitura);
