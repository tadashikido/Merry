namespace Celebri.Aplicacao.Convidados;

public interface IConviteService
{
    Task<ListaConvitesDto> ListarAsync(Guid eventoId, CancellationToken cancelamento);

    Task<TotaisConvidadosDto> ObterTotaisAsync(Guid eventoId, CancellationToken cancelamento);

    Task<ConviteDto> ObterAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);

    Task<ConviteDto> CriarAsync(Guid eventoId, SalvarConviteRequest request, CancellationToken cancelamento);

    Task<ConviteDto> AtualizarAsync(Guid eventoId, Guid conviteId, SalvarConviteRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);
}
