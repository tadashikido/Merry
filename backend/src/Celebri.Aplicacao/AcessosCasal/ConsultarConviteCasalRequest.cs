using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.AcessosCasal;

public sealed record ConsultarConviteCasalRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenConviteCasal.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string? Token);
