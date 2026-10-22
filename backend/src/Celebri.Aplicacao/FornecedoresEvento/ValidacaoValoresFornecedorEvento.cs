using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresEvento;

public static class ValidacaoValoresFornecedorEvento
{
    public static IEnumerable<ValidationResult> Validar(
        decimal? valorOrcado,
        decimal? valorContratado,
        StatusFornecedorEvento? status)
    {
        if (status is { } valorStatus && !Enum.IsDefined(valorStatus))
        {
            yield return new ValidationResult(MensagensFornecedoresEvento.StatusInvalido, ["Status"]);
        }

        if (!FornecedorEvento.ValorValido(valorOrcado))
        {
            yield return new ValidationResult(MensagensFornecedoresEvento.ValorInvalido, ["ValorOrcado"]);
        }

        if (!FornecedorEvento.ValorValido(valorContratado))
        {
            yield return new ValidationResult(MensagensFornecedoresEvento.ValorInvalido, ["ValorContratado"]);
        }
        else if (status == StatusFornecedorEvento.Contratado && valorContratado is null)
        {
            yield return new ValidationResult(MensagensFornecedoresEvento.ContratadoSemValor, ["ValorContratado"]);
        }
    }
}
