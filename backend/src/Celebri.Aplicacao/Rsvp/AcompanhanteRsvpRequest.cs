using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Rsvp;

public sealed record AcompanhanteRsvpRequest(
    Guid? Id,
    [Required(ErrorMessage = MensagensConvidados.NomeAcompanhanteObrigatorio)]
    [StringLength(Convidado.TamanhoMaximoNome, ErrorMessage = MensagensConvidados.TamanhoNomeAcompanhante)]
    string? Nome,
    [property: JsonConverter(typeof(JsonStringEnumConverter<FaixaEtaria>))]
    FaixaEtaria? FaixaEtaria,
    RestricaoAlimentarRequest? Restricao = null);
