namespace Casamento.Aplicacao.FornecedoresCasamento;

public interface IFornecedorCasamentoService
{
    Task<ListaFornecedoresCasamentoDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<FornecedorCasamentoDto> ObterAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<FornecedorCasamentoDto> VincularAsync(Guid casamentoId, VincularFornecedorRequest request, CancellationToken cancelamento);

    Task<FornecedorCasamentoDto> AtualizarAsync(
        Guid casamentoId,
        Guid vinculoId,
        AtualizarFornecedorCasamentoRequest request,
        CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<FornecedorCasamentoDto> AnexarContratoAsync(
        Guid casamentoId,
        Guid vinculoId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento);

    Task<ArquivoContrato> ObterContratoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<FornecedorCasamentoDto> RemoverContratoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento);

    Task<ResultadoImportacaoFornecedoresDto> ImportarAsync(
        Guid casamentoId,
        ImportarFornecedoresRequest request,
        CancellationToken cancelamento);
}
