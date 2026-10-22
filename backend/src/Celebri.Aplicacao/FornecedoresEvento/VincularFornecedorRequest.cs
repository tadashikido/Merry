using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record VincularFornecedorRequest(
    [Required(ErrorMessage = MensagensFornecedoresEvento.FornecedorObrigatorio)]
    Guid? FornecedorId,
    [StringLength(FornecedorEvento.TamanhoMaximoServico, ErrorMessage = MensagensFornecedoresEvento.TamanhoServico)]
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    [property: JsonConverter(typeof(JsonStringEnumConverter<StatusFornecedorEvento>))]
    StatusFornecedorEvento? Status,
    [StringLength(FornecedorEvento.TamanhoMaximoNotas, ErrorMessage = MensagensFornecedoresEvento.TamanhoNotas)]
    string? NotasInternas) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (FornecedorId == Guid.Empty)
        {
            yield return new ValidationResult(MensagensFornecedoresEvento.FornecedorObrigatorio, [nameof(FornecedorId)]);
        }

        foreach (var resultado in ValidacaoValoresFornecedorEvento.Validar(ValorOrcado, ValorContratado, Status))
        {
            yield return resultado;
        }
    }

    public DadosFornecedorEvento ParaDados()
    {
        return new DadosFornecedorEvento(
            Servico,
            ValorOrcado,
            ValorContratado,
            Status ?? StatusFornecedorEvento.Cotacao,
            NotasInternas);
    }
}
