using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.Autenticacao;

public sealed record EsqueciSenhaRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(NormalizadorEmail.TamanhoMaximo, ErrorMessage = MensagensValidacao.EmailInvalido)]
    [EmailAddress(ErrorMessage = MensagensValidacao.EmailInvalido)]
    string Email);
