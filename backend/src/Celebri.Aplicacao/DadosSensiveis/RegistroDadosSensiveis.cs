using Casamento.Dominio.Convidados;
using Casamento.Dominio.DadosSensiveis;

namespace Casamento.Aplicacao.DadosSensiveis;

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
