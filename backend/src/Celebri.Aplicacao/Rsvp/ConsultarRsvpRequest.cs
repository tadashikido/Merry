using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.Rsvp;

public sealed record ConsultarRsvpRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenRsvp.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.Obrigatorio)]
    string? Token);
