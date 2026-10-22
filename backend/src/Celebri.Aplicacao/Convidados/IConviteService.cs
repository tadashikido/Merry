namespace Celebri.Aplicacao.Convidados;

public interface IConviteService
{
    Task<ListaConvitesDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<TotaisConvidadosDto> ObterTotaisAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<ConviteDto> ObterAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);

    Task<ConviteDto> CriarAsync(Guid casamentoId, SalvarConviteRequest request, CancellationToken cancelamento);

    Task<ConviteDto> AtualizarAsync(Guid casamentoId, Guid conviteId, SalvarConviteRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);
}
