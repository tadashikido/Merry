using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Tarefas;

public sealed record AlterarStatusTarefaRequest(
    [Required(ErrorMessage = MensagensTarefas.StatusObrigatorio)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<StatusTarefa>))]
    StatusTarefa? Status) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Status is { } status && !Enum.IsDefined(status))
        {
            yield return new ValidationResult(MensagensTarefas.StatusInvalido, [nameof(Status)]);
        }
    }
}
