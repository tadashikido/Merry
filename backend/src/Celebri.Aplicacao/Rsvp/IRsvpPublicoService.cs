namespace Casamento.Aplicacao.Rsvp;

public interface IRsvpPublicoService
{
    Task<RsvpPublicoDto> ConsultarAsync(ConsultarRsvpRequest request, CancellationToken cancelamento);

    Task<RsvpPublicoDto> ResponderAsync(ResponderRsvpRequest request, CancellationToken cancelamento);
}
