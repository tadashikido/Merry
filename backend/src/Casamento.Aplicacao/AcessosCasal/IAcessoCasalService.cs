using Casamento.Aplicacao.Autenticacao;

namespace Casamento.Aplicacao.AcessosCasal;

public interface IAcessoCasalService
{
    Task<IReadOnlyList<AcessoCasalDto>> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<AcessoCasalDto> ConvidarAsync(Guid casamentoId, ConvidarCasalRequest request, CancellationToken cancelamento);

    Task<AcessoCasalDto> ReenviarAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento);

    Task RevogarAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento);

    Task<ConviteAcessoCasalDto> ConsultarConviteAsync(ConsultarConviteCasalRequest request, CancellationToken cancelamento);

    Task<ResultadoAutenticacao> AceitarConviteAsync(AceitarConviteCasalRequest request, CancellationToken cancelamento);
}
