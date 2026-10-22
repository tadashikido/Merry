namespace Celebri.Aplicacao.Financeiro;

public interface IParcelaFornecedorService
{
    Task<FinanceiroEventoDto> ObterFinanceiroAsync(Guid eventoId, CancellationToken cancelamento);

    Task<AlertasPagamentosDto> ObterAlertasEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<AlertasPagamentosDto> ObterAlertasOrganizacaoAsync(CancellationToken cancelamento);

    Task<CronogramaParcelasDto> ListarAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<ParcelaDto> CriarAsync(Guid eventoId, Guid vinculoId, SalvarParcelaRequest request, CancellationToken cancelamento);

    Task<CronogramaParcelasDto> GerarAsync(Guid eventoId, Guid vinculoId, GerarParcelasRequest request, CancellationToken cancelamento);

    Task<ParcelaDto> AtualizarAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, SalvarParcelaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<ParcelaDto> RegistrarPagamentoAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        RegistrarPagamentoRequest request,
        CancellationToken cancelamento);

    Task<ParcelaDto> DesfazerPagamentoAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<ParcelaDto> AnexarComprovanteAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento);

    Task<ArquivoComprovanteParcela> ObterComprovanteAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);

    Task<ParcelaDto> RemoverComprovanteAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento);
}
