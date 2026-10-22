using Celebri.Dominio.Eventos;

namespace Celebri.Testes.Unidade.Eventos;

public class CalculadoraFaseEventoTestes
{
    [Theory]
    [InlineData(365, FaseEvento.Planejamento)]
    [InlineData(120, FaseEvento.Planejamento)]
    [InlineData(91, FaseEvento.Planejamento)]
    [InlineData(90, FaseEvento.RetaFinal)]
    [InlineData(30, FaseEvento.RetaFinal)]
    [InlineData(8, FaseEvento.RetaFinal)]
    [InlineData(7, FaseEvento.SemanaDoEvento)]
    [InlineData(5, FaseEvento.SemanaDoEvento)]
    [InlineData(1, FaseEvento.SemanaDoEvento)]
    [InlineData(0, FaseEvento.DiaDoEvento)]
    [InlineData(-1, FaseEvento.Realizado)]
    [InlineData(-3, FaseEvento.Realizado)]
    [InlineData(-3650, FaseEvento.Realizado)]
    public void Calcular_DeveRespeitarLimitesDasFases(int diasRestantes, FaseEvento esperada)
    {
        Assert.Equal(esperada, CalculadoraFaseEvento.Calcular(diasRestantes));
    }
}
