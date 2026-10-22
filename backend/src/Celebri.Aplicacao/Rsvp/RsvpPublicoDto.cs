namespace Celebri.Aplicacao.Rsvp;

public sealed record RsvpPublicoDto(
    EventoRsvpDto Evento,
    string NomeConvite,
    int LimiteAcompanhantes,
    DateOnly DataLimiteResposta,
    bool PodeResponder,
    DateTimeOffset? RespondidoEm,
    IReadOnlyList<PessoaRsvpDto> Pessoas,
    IReadOnlyList<AcompanhanteRsvpDto> Acompanhantes,
    PrivacidadeRsvpDto Privacidade,
    bool PreVisualizacao);
