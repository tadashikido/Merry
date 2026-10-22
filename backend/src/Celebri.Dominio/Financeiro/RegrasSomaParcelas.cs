using Celebri.Dominio.Excecoes;

namespace Celebri.Dominio.Financeiro;

public static class RegrasSomaParcelas
{
    public static decimal SaldoAParcelar(decimal valorContratado, decimal somaParcelas)
    {
        return Math.Max(valorContratado - somaParcelas, 0m);
    }

    public static void GarantirDentroDoContratado(decimal valorContratado, decimal somaResultante, string campo)
    {
        if (somaResultante > valorContratado)
        {
            throw new RegraNegocioException(
                MensagensFinanceiro.SomaExcede(FormatacaoMoeda.Formatar(somaResultante - valorContratado)),
                campo);
        }
    }
}
