using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresCasamento;

public sealed record VincularFornecedorRequest(
    [Required(ErrorMessage = MensagensFornecedoresCasamento.FornecedorObrigatorio)]
    Guid? FornecedorId,
    [StringLength(FornecedorCasamento.TamanhoMaximoServico, ErrorMessage = MensagensFornecedoresCasamento.TamanhoServico)]
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    [property: JsonConverter(typeof(JsonStringEnumConverter<StatusFornecedorCasamento>))]
    StatusFornecedorCasamento? Status,
    [StringLength(FornecedorCasamento.TamanhoMaximoNotas, ErrorMessage = MensagensFornecedoresCasamento.TamanhoNotas)]
    string? NotasInternas) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (FornecedorId == Guid.Empty)
        {
            yield return new ValidationResult(MensagensFornecedoresCasamento.FornecedorObrigatorio, [nameof(FornecedorId)]);
        }

        foreach (var resultado in ValidacaoValoresFornecedorCasamento.Validar(ValorOrcado, ValorContratado, Status))
        {
            yield return resultado;
        }
    }

    public DadosFornecedorCasamento ParaDados()
    {
        return new DadosFornecedorCasamento(
            Servico,
            ValorOrcado,
            ValorContratado,
            Status ?? StatusFornecedorCasamento.Cotacao,
            NotasInternas);
    }
}
