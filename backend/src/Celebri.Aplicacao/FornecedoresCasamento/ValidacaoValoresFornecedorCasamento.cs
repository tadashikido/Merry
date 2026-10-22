using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresCasamento;

public static class ValidacaoValoresFornecedorCasamento
{
    public static IEnumerable<ValidationResult> Validar(
        decimal? valorOrcado,
        decimal? valorContratado,
        StatusFornecedorCasamento? status)
    {
        if (status is { } valorStatus && !Enum.IsDefined(valorStatus))
        {
            yield return new ValidationResult(MensagensFornecedoresCasamento.StatusInvalido, ["Status"]);
        }

        if (!FornecedorCasamento.ValorValido(valorOrcado))
        {
            yield return new ValidationResult(MensagensFornecedoresCasamento.ValorInvalido, ["ValorOrcado"]);
        }

        if (!FornecedorCasamento.ValorValido(valorContratado))
        {
            yield return new ValidationResult(MensagensFornecedoresCasamento.ValorInvalido, ["ValorContratado"]);
        }
        else if (status == StatusFornecedorCasamento.Contratado && valorContratado is null)
        {
            yield return new ValidationResult(MensagensFornecedoresCasamento.ContratadoSemValor, ["ValorContratado"]);
        }
    }
}
