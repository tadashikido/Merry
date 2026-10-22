using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.DadosSensiveis;

namespace Casamento.Aplicacao.DadosSensiveis;

public sealed record ConsentimentoRsvpRequest(
    bool? Aceito,
    [StringLength(TermoPrivacidadeRsvp.TamanhoMaximoVersao, ErrorMessage = MensagensDadosSensiveis.TermoDesatualizado)]
    string? VersaoTermo);
