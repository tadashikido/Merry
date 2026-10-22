using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Financeiro;

namespace Casamento.Aplicacao.Financeiro;

public sealed record GerarParcelasRequest(
    [Required(ErrorMessage = MensagensFinanceiro.QuantidadeObrigatoria)]
    [Range(1, ParcelaFornecedor.LimitePorVinculo, ErrorMessage = MensagensFinanceiro.QuantidadeInvalida)]
    int? Quantidade,
    decimal? ValorTotal,
    [Required(ErrorMessage = MensagensFinanceiro.PrimeiroVencimentoObrigatorio)]
    DateOnly? PrimeiroVencimento,
    [StringLength(ParcelaFornecedor.TamanhoMaximoObservacao, ErrorMessage = MensagensFinanceiro.TamanhoObservacao)]
    string? Observacao) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ValorTotal is { } valor && !ParcelaFornecedor.ValorValido(valor))
        {
            yield return new ValidationResult(MensagensFinanceiro.ValorInvalido, [nameof(ValorTotal)]);
        }

        if (PrimeiroVencimento is { } data && !ParcelaFornecedor.VencimentoValido(data))
        {
            yield return new ValidationResult(MensagensFinanceiro.VencimentoInvalido, [nameof(PrimeiroVencimento)]);
        }
    }
}
