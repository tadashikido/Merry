namespace Casamento.Aplicacao.FornecedoresCasamento;

public sealed record ListaFornecedoresCasamentoDto(
    IReadOnlyList<FornecedorCasamentoDto> Vinculos,
    ResumoOrcamentoDto Resumo,
    bool CasamentoArquivado,
    bool SomenteLeitura);
