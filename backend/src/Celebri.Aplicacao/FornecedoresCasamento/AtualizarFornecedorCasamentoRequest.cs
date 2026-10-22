using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresCasamento;

public sealed record AtualizarFornecedorCasamentoRequest(
    [StringLength(FornecedorCasamento.TamanhoMaximoServico, ErrorMessage = MensagensFornecedoresCasamento.TamanhoServico)]
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    [Required(ErrorMessage = MensagensFornecedoresCasamento.StatusObrigatorio)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<StatusFornecedorCasamento>))]
    StatusFornecedorCasamento? Status,
    [StringLength(FornecedorCasamento.TamanhoMaximoNotas, ErrorMessage = MensagensFornecedoresCasamento.TamanhoNotas)]
    string? NotasInternas) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        return ValidacaoValoresFornecedorCasamento.Validar(ValorOrcado, ValorContratado, Status);
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
