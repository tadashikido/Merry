using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Autenticacao;

namespace Casamento.Aplicacao.CronogramaPublico;

public sealed record ConsultarCronogramaPublicoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenCronograma.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.Obrigatorio)]
    string? Token);
