using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.AcessosAnfitriao;

public interface IAcessoAnfitriaoService
{
    Task<IReadOnlyList<AcessoAnfitriaoDto>> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<AcessoAnfitriaoDto> ConvidarAsync(Guid eventoId, ConvidarAnfitriaoRequest request, CancellationToken cancelamento);

    Task<AcessoAnfitriaoDto> ReenviarAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento);

    Task RevogarAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento);

    Task<ConviteAcessoAnfitriaoDto> ConsultarConviteAsync(ConsultarConviteAnfitriaoRequest request, CancellationToken cancelamento);

    Task<ResultadoAutenticacao> AceitarConviteAsync(AceitarConviteAnfitriaoRequest request, CancellationToken cancelamento);
}
