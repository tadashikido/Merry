using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Mesas;

namespace Celebri.Aplicacao.Mesas;

public sealed record PessoasMesaRequest(
    [Required(ErrorMessage = MensagensMesas.PessoasObrigatorias)]
    [MinLength(1, ErrorMessage = MensagensMesas.PessoasObrigatorias)]
    [MaxLength(Mesa.PessoasMaximoPorOperacao, ErrorMessage = MensagensMesas.PessoasDemais)]
    IReadOnlyList<Guid>? ConvidadosIds) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ConvidadosIds is null)
        {
            yield break;
        }

        if (ConvidadosIds.Any(identificador => identificador == Guid.Empty))
        {
            yield return new ValidationResult(MensagensMesas.PessoaDeOutroEvento, [nameof(ConvidadosIds)]);
        }

        if (ConvidadosIds.Distinct().Count() != ConvidadosIds.Count)
        {
            yield return new ValidationResult(MensagensMesas.PessoaRepetida, [nameof(ConvidadosIds)]);
        }
    }

    public IReadOnlyList<Guid> Identificadores()
    {
        return ConvidadosIds ?? [];
    }
}
