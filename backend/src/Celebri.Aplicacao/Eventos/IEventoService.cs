namespace Celebri.Aplicacao.Eventos;

public interface IEventoService
{
    Task<IReadOnlyList<EventoResumoDto>> ListarAsync(SituacaoListagemEventos situacao, CancellationToken cancelamento);

    Task<EventoDto> ObterAsync(Guid id, CancellationToken cancelamento);

    Task<EventoDto> CriarAsync(SalvarEventoRequest request, CancellationToken cancelamento);

    Task<EventoDto> AtualizarAsync(Guid id, SalvarEventoRequest request, CancellationToken cancelamento);

    Task<EventoDto> ArquivarAsync(Guid id, CancellationToken cancelamento);

    Task<EventoDto> RestaurarAsync(Guid id, CancellationToken cancelamento);
}
