namespace Celebri.Aplicacao.Casamentos;

public interface ICasamentoService
{
    Task<IReadOnlyList<CasamentoResumoDto>> ListarAsync(SituacaoListagemCasamentos situacao, CancellationToken cancelamento);

    Task<CasamentoDto> ObterAsync(Guid id, CancellationToken cancelamento);

    Task<CasamentoDto> CriarAsync(SalvarCasamentoRequest request, CancellationToken cancelamento);

    Task<CasamentoDto> AtualizarAsync(Guid id, SalvarCasamentoRequest request, CancellationToken cancelamento);

    Task<CasamentoDto> ArquivarAsync(Guid id, CancellationToken cancelamento);

    Task<CasamentoDto> RestaurarAsync(Guid id, CancellationToken cancelamento);
}
