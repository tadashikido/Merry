using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Checklists;

namespace Celebri.Aplicacao.Checklists;

public sealed record AplicarModeloChecklistRequest(
    [Required(ErrorMessage = MensagensChecklist.ModeloObrigatorio)]
    Guid? ModeloId) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ModeloId == Guid.Empty)
        {
            yield return new ValidationResult(MensagensChecklist.ModeloObrigatorio, [nameof(ModeloId)]);
        }
    }
}
