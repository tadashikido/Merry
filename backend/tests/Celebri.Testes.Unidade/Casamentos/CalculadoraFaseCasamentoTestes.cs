using Celebri.Dominio.Casamentos;

namespace Celebri.Testes.Unidade.Casamentos;

public class CalculadoraFaseCasamentoTestes
{
    [Theory]
    [InlineData(365, FaseCasamento.Planejamento)]
    [InlineData(120, FaseCasamento.Planejamento)]
    [InlineData(91, FaseCasamento.Planejamento)]
    [InlineData(90, FaseCasamento.RetaFinal)]
    [InlineData(30, FaseCasamento.RetaFinal)]
    [InlineData(8, FaseCasamento.RetaFinal)]
    [InlineData(7, FaseCasamento.SemanaDoCasamento)]
    [InlineData(5, FaseCasamento.SemanaDoCasamento)]
    [InlineData(1, FaseCasamento.SemanaDoCasamento)]
    [InlineData(0, FaseCasamento.DiaDoCasamento)]
    [InlineData(-1, FaseCasamento.Realizado)]
    [InlineData(-3, FaseCasamento.Realizado)]
    [InlineData(-3650, FaseCasamento.Realizado)]
    public void Calcular_DeveRespeitarLimitesDasFases(int diasRestantes, FaseCasamento esperada)
    {
        Assert.Equal(esperada, CalculadoraFaseCasamento.Calcular(diasRestantes));
    }
}
