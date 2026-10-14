using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Usuarios;

namespace Casamento.Aplicacao.Autenticacao;

public sealed record RedefinirSenhaRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string Token,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    string NovaSenha) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (NovaSenha is not null)
        {
            var erroSenha = PoliticaSenha.Validar(NovaSenha);
            if (erroSenha is not null)
            {
                yield return new ValidationResult(erroSenha, [nameof(NovaSenha)]);
            }
        }
    }
}
