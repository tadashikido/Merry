using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.AcessosAnfitriao;

public sealed record ConsultarConviteAnfitriaoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenConviteAnfitriao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string? Token);
