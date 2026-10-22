namespace Celebri.Aplicacao.Autenticacao;

public interface IRecuperacaoSenhaService
{
    Task<SolicitacaoRecuperacaoDto> SolicitarAsync(EsqueciSenhaRequest request, CancellationToken cancelamento);

    Task RedefinirAsync(RedefinirSenhaRequest request, CancellationToken cancelamento);
}
