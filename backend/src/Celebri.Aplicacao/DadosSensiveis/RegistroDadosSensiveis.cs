using Celebri.Dominio.Convidados;
using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Aplicacao.DadosSensiveis;

public sealed record RegistroDadosSensiveis(
    Guid ConvidadoId,
    Guid ConviteId,
    string Nome,
    bool Acompanhante,
    RespostaRsvp Resposta,
    string? ConteudoCifrado,
    OrigemConsentimento OrigemConsentimento,
    DateTimeOffset ConsentidoEm,
    DateTimeOffset? ExcluidoEm);
