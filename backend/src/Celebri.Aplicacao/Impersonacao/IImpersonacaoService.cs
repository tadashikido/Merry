namespace Celebri.Aplicacao.Impersonacao;

public interface IImpersonacaoService
{
    Task<SessaoImpersonacaoDto> IniciarAsync(Guid operadorId, IniciarImpersonacaoRequest request, CancellationToken cancelamento);

    Task EncerrarAsync(Guid sessaoId, CancellationToken cancelamento);

    Task<IReadOnlyList<SessaoImpersonacaoResumoDto>> ListarAsync(int limite, CancellationToken cancelamento);
}
