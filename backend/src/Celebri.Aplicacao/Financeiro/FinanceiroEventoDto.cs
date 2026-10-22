using Celebri.Aplicacao.FornecedoresEvento;

namespace Celebri.Aplicacao.Financeiro;

public sealed record FinanceiroEventoDto(
    ResumoOrcamentoDto Resumo,
    TotaisAlertasDto Alertas,
    IReadOnlyList<FornecedorFinanceiroDto> Fornecedores,
    DateOnly Hoje,
    bool EventoArquivado,
    bool SomenteLeitura);
