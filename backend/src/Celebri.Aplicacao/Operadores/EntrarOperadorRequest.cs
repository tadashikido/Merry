using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.Operadores;

public sealed record EntrarOperadorRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string Email,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string Senha);
