using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Usuarios;

namespace Casamento.Aplicacao.Autenticacao;

public sealed record EsqueciSenhaRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(NormalizadorEmail.TamanhoMaximo, ErrorMessage = MensagensValidacao.EmailInvalido)]
    [EmailAddress(ErrorMessage = MensagensValidacao.EmailInvalido)]
    string Email);
