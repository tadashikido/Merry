using Celebri.Aplicacao.FornecedoresCasamento;

namespace Celebri.Aplicacao.Financeiro;

public sealed record FinanceiroCasamentoDto(
    ResumoOrcamentoDto Resumo,
    TotaisAlertasDto Alertas,
    IReadOnlyList<FornecedorFinanceiroDto> Fornecedores,
    DateOnly Hoje,
    bool CasamentoArquivado,
    bool SomenteLeitura);
