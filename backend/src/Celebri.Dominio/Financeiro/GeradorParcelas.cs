using Celebri.Dominio.Excecoes;

namespace Celebri.Dominio.Financeiro;

public static class GeradorParcelas
{
    public static IReadOnlyList<DadosParcela> Gerar(decimal total, int quantidade, DateOnly primeiroVencimento, string? observacao = null)
    {
        if (quantidade < 1 || quantidade > ParcelaFornecedor.LimitePorVinculo)
        {
            throw new RegraNegocioException(MensagensFinanceiro.QuantidadeInvalida, ParcelaFornecedor.CampoQuantidade);
        }

        if (!ParcelaFornecedor.ValorValido(total))
        {
            throw new RegraNegocioException(MensagensFinanceiro.ValorInvalido, ParcelaFornecedor.CampoValorTotal);
        }

        if (!ParcelaFornecedor.VencimentoValido(primeiroVencimento))
        {
            throw new RegraNegocioException(MensagensFinanceiro.VencimentoInvalido, ParcelaFornecedor.CampoPrimeiroVencimento);
        }

        var totalCentavos = decimal.ToInt64(total * 100m);
        var baseCentavos = totalCentavos / quantidade;

        if (baseCentavos < 1)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ValorPequenoParaDividir, ParcelaFornecedor.CampoQuantidade);
        }

        var ultimaCentavos = totalCentavos - (baseCentavos * (quantidade - 1));
        var parcelas = new List<DadosParcela>(quantidade);

        for (var indice = 0; indice < quantidade; indice++)
        {
            var centavos = indice == quantidade - 1 ? ultimaCentavos : baseCentavos;
            var vencimento = primeiroVencimento.AddMonths(indice);

            if (!ParcelaFornecedor.VencimentoValido(vencimento))
            {
                throw new RegraNegocioException(MensagensFinanceiro.VencimentoInvalido, ParcelaFornecedor.CampoPrimeiroVencimento);
            }

            parcelas.Add(new DadosParcela(centavos / 100m, vencimento, observacao));
        }

        return parcelas;
    }
}
