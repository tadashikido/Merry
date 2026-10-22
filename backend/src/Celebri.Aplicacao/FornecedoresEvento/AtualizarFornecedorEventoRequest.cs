using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record AtualizarFornecedorEventoRequest(
    [StringLength(FornecedorEvento.TamanhoMaximoServico, ErrorMessage = MensagensFornecedoresEvento.TamanhoServico)]
    string? Servico,
    decimal? ValorOrcado,
    decimal? ValorContratado,
    [Required(ErrorMessage = MensagensFornecedoresEvento.StatusObrigatorio)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<StatusFornecedorEvento>))]
    StatusFornecedorEvento? Status,
    [StringLength(FornecedorEvento.TamanhoMaximoNotas, ErrorMessage = MensagensFornecedoresEvento.TamanhoNotas)]
    string? NotasInternas) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        return ValidacaoValoresFornecedorEvento.Validar(ValorOrcado, ValorContratado, Status);
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
