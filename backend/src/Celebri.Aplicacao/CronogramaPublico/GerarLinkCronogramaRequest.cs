using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.CronogramaPublico;

public sealed record GerarLinkCronogramaRequest(
    [Required(ErrorMessage = MensagensAcessoCronograma.TipoInvalido)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<TipoAcessoCronograma>))]
    TipoAcessoCronograma? Tipo,
    Guid? FornecedorCasamentoId,
    [StringLength(ItemCronograma.TamanhoMaximoResponsavel, ErrorMessage = MensagensCronograma.TamanhoResponsavel)]
    string? Responsavel) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Tipo is { } tipo && !Enum.IsDefined(tipo))
        {
            yield return new ValidationResult(MensagensAcessoCronograma.TipoInvalido, [nameof(Tipo)]);
        }
    }

    public DestinoAcessoCronograma ParaDestino()
    {
        return Tipo switch
        {
            TipoAcessoCronograma.Fornecedor => DestinoAcessoCronograma.DoFornecedor(FornecedorCasamentoId),
            TipoAcessoCronograma.Responsavel => DestinoAcessoCronograma.DoResponsavel(Responsavel),
            TipoAcessoCronograma.Geral => DestinoAcessoCronograma.Geral(),
            _ => throw new RegraNegocioException(MensagensAcessoCronograma.TipoInvalido, DestinoAcessoCronograma.CampoTipo),
        };
    }
}
