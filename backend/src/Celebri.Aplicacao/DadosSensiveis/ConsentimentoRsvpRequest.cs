using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Aplicacao.DadosSensiveis;

public sealed record ConsentimentoRsvpRequest(
    bool? Aceito,
    [StringLength(TermoPrivacidadeRsvp.TamanhoMaximoVersao, ErrorMessage = MensagensDadosSensiveis.TermoDesatualizado)]
    string? VersaoTermo);
