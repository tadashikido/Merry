using System.ComponentModel.DataAnnotations;

namespace Celebri.Aplicacao.Confirmacoes;

public sealed class ExportarBuffetRequest : IValidatableObject
{
    private const int TamanhoMaximoFormato = 20;

    private static readonly Dictionary<string, FormatoExportacaoBuffet> Formatos =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["csv"] = FormatoExportacaoBuffet.Csv,
            ["impressao"] = FormatoExportacaoBuffet.Impressao,
        };

    [Required(ErrorMessage = MensagensConfirmacoes.FormatoObrigatorio)]
    [StringLength(TamanhoMaximoFormato, ErrorMessage = MensagensConfirmacoes.FormatoInvalido)]
    public string? Formato { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Formato is not null && !Formatos.ContainsKey(Formato))
        {
            yield return new ValidationResult(MensagensConfirmacoes.FormatoInvalido, [nameof(Formato)]);
        }
    }

    public FormatoExportacaoBuffet ParaFormato()
    {
        return Formato is not null && Formatos.TryGetValue(Formato, out var formato)
            ? formato
            : throw new ArgumentException(MensagensConfirmacoes.FormatoInvalido, nameof(Formato));
    }
}
