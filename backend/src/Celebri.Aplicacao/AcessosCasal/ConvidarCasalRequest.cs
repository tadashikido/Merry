using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.AcessosCasal;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.AcessosCasal;

public sealed record ConvidarCasalRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(AcessoCasal.TamanhoMaximoNome, MinimumLength = AcessoCasal.TamanhoMinimoNome, ErrorMessage = MensagensValidacao.TamanhoNome)]
    string? Nome,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(NormalizadorEmail.TamanhoMaximo, ErrorMessage = MensagensValidacao.EmailInvalido)]
    [EmailAddress(ErrorMessage = MensagensValidacao.EmailInvalido)]
    string? Email) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Nome is not null && Nome.Trim().Length < AcessoCasal.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensValidacao.TamanhoNome, [nameof(Nome)]);
        }
    }
}
