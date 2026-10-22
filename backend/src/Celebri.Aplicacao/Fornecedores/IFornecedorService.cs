namespace Celebri.Aplicacao.Fornecedores;

public interface IFornecedorService
{
    Task<IReadOnlyList<FornecedorResumoDto>> ListarAsync(CancellationToken cancelamento);

    Task<FornecedorDto> ObterAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task<FornecedorDto> CriarAsync(SalvarFornecedorRequest request, CancellationToken cancelamento);

    Task<FornecedorDto> AtualizarAsync(Guid fornecedorId, SalvarFornecedorRequest request, CancellationToken cancelamento);

    Task<FornecedorDto> ArquivarAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task<FornecedorDto> RestaurarAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task RemoverAsync(Guid fornecedorId, CancellationToken cancelamento);

    Task<IReadOnlyList<ParticipacaoFornecedorDto>> ListarParticipacoesAsync(Guid fornecedorId, CancellationToken cancelamento);
}
