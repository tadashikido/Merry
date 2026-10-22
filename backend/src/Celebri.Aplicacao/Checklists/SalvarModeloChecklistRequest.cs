using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Checklists;

public sealed record SalvarModeloChecklistRequest(
    [Required(ErrorMessage = MensagensChecklist.NomeObrigatorio)]
    [StringLength(ModeloChecklist.TamanhoMaximoNome, ErrorMessage = MensagensChecklist.TamanhoNome)]
    string? Nome,
    [StringLength(ModeloChecklist.TamanhoMaximoDescricao, ErrorMessage = MensagensChecklist.TamanhoDescricaoModelo)]
    string? Descricao) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var nome = NormalizadorTexto.Normalizar(Nome);

        if (nome is not null && nome.Length < ModeloChecklist.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensChecklist.TamanhoNome, [nameof(Nome)]);
        }
    }
}
