using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.CronogramaPublico;

public sealed record ConsultarCronogramaPublicoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenCronograma.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.Obrigatorio)]
    string? Token);
