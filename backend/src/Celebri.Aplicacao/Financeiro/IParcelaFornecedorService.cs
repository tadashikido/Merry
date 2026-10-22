namespace Celebri.Aplicacao.Financeiro;

public interface IParcelaFornecedorService
{
    Task<FinanceiroCasamentoDto> ObterFinanceiroAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<AlertasPagamentosDto> ObterAlertasCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<AlertasPagamentosDto> ObterAlertasOrganizacaoAsync(CancellationToken cancelamento);

    Task<CronogramaParcelasDto> ListarAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<ParcelaDto> CriarAsync(Guid casamentoId, Guid vinculoId, SalvarParcelaRequest request, CancellationToken cancelamento);

    Task<CronogramaParcelasDto> GerarAsync(Guid casamentoId, Guid vinculoId, GerarParcelasRequest request, CancellationToken cancelamento);

    Task<ParcelaDto> AtualizarAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, SalvarParcelaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<ParcelaDto> RegistrarPagamentoAsync(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        RegistrarPagamentoRequest request,
        CancellationToken cancelamento);

    Task<ParcelaDto> DesfazerPagamentoAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<ParcelaDto> AnexarComprovanteAsync(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento);

    Task<ArquivoComprovanteParcela> ObterComprovanteAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<ParcelaDto> RemoverComprovanteAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);
}
