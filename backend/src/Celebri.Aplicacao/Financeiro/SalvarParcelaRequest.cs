using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Financeiro;

namespace Celebri.Aplicacao.Financeiro;

public sealed record SalvarParcelaRequest(
    [Required(ErrorMessage = MensagensFinanceiro.ValorObrigatorio)]
    decimal? Valor,
    [Required(ErrorMessage = MensagensFinanceiro.VencimentoObrigatorio)]
    DateOnly? Vencimento,
    [StringLength(ParcelaFornecedor.TamanhoMaximoObservacao, ErrorMessage = MensagensFinanceiro.TamanhoObservacao)]
    string? Observacao) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Valor is { } valor && !ParcelaFornecedor.ValorValido(valor))
        {
            yield return new ValidationResult(MensagensFinanceiro.ValorInvalido, [nameof(Valor)]);
        }

        if (Vencimento is { } vencimento && !ParcelaFornecedor.VencimentoValido(vencimento))
        {
            yield return new ValidationResult(MensagensFinanceiro.VencimentoInvalido, [nameof(Vencimento)]);
        }
    }

    public DadosParcela ParaDados()
    {
        return new DadosParcela(
            Valor ?? throw new InvalidOperationException("Valor não validado."),
            Vencimento ?? throw new InvalidOperationException("Vencimento não validado."),
            Observacao);
    }
}
