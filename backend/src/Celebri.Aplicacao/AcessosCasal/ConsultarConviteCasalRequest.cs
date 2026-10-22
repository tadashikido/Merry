using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Autenticacao;

namespace Casamento.Aplicacao.AcessosCasal;

public sealed record ConsultarConviteCasalRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenConviteCasal.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string? Token);
