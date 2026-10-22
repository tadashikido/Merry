using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.ModelosCronograma;

public sealed record AplicarModeloCronogramaRequest(
    [Required(ErrorMessage = MensagensModeloCronograma.ModeloObrigatorio)]
    Guid? ModeloId) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ModeloId == Guid.Empty)
        {
            yield return new ValidationResult(MensagensModeloCronograma.ModeloObrigatorio, [nameof(ModeloId)]);
        }
    }
}
