using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.AcessosAnfitriao;

public sealed record ConvidarAnfitriaoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(AcessoAnfitriao.TamanhoMaximoNome, MinimumLength = AcessoAnfitriao.TamanhoMinimoNome, ErrorMessage = MensagensValidacao.TamanhoNome)]
    string? Nome,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(NormalizadorEmail.TamanhoMaximo, ErrorMessage = MensagensValidacao.EmailInvalido)]
    [EmailAddress(ErrorMessage = MensagensValidacao.EmailInvalido)]
    string? Email) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Nome is not null && Nome.Trim().Length < AcessoAnfitriao.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensValidacao.TamanhoNome, [nameof(Nome)]);
        }
    }
}
