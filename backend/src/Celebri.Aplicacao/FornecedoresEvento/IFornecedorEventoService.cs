namespace Celebri.Aplicacao.FornecedoresEvento;

public interface IFornecedorEventoService
{
    Task<ListaFornecedoresEventoDto> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<FornecedorEventoDto> ObterAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<FornecedorEventoDto> VincularAsync(Guid eventoId, VincularFornecedorRequest request, CancellationToken cancelamento);

    Task<FornecedorEventoDto> AtualizarAsync(
        Guid eventoId,
        Guid vinculoId,
        AtualizarFornecedorEventoRequest request,
        CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<FornecedorEventoDto> AnexarContratoAsync(
        Guid eventoId,
        Guid vinculoId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento);

    Task<ArquivoContrato> ObterContratoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<FornecedorEventoDto> RemoverContratoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento);

    Task<ResultadoImportacaoFornecedoresDto> ImportarAsync(
        Guid eventoId,
        ImportarFornecedoresRequest request,
        CancellationToken cancelamento);
}
