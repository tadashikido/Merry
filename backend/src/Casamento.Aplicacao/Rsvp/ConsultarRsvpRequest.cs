using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Autenticacao;

namespace Casamento.Aplicacao.Rsvp;

public sealed record ConsultarRsvpRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenRsvp.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.Obrigatorio)]
    string? Token);
