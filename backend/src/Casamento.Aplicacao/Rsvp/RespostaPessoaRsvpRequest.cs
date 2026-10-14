using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Rsvp;

public sealed record RespostaPessoaRsvpRequest(
    [Required(ErrorMessage = MensagensConvidados.RespostaPresencaInvalida)]
    Guid? Id,
    [Required(ErrorMessage = MensagensConvidados.RespostaPresencaInvalida)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<RespostaRsvp>))]
    RespostaRsvp? Resposta,
    RestricaoAlimentarRequest? Restricao = null);
