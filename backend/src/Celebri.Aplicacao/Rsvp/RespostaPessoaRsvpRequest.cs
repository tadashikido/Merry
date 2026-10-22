using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Rsvp;

public sealed record RespostaPessoaRsvpRequest(
    [Required(ErrorMessage = MensagensConvidados.RespostaPresencaInvalida)]
    Guid? Id,
    [Required(ErrorMessage = MensagensConvidados.RespostaPresencaInvalida)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<RespostaRsvp>))]
    RespostaRsvp? Resposta,
    RestricaoAlimentarRequest? Restricao = null);
