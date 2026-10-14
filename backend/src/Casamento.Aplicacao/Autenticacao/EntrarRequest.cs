using System.ComponentModel.DataAnnotations;

namespace Casamento.Aplicacao.Autenticacao;

public sealed record EntrarRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string Email,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string Senha);
