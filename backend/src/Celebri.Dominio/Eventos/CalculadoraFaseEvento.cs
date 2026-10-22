namespace Celebri.Dominio.Eventos;

public static class CalculadoraFaseEvento
{
    public const int LimiteRetaFinalDias = 90;
    public const int LimiteSemanaDias = 7;

    public static FaseEvento Calcular(int diasRestantes)
    {
        return diasRestantes switch
        {
            < 0 => FaseEvento.Realizado,
            0 => FaseEvento.DiaDoEvento,
            <= LimiteSemanaDias => FaseEvento.SemanaDoEvento,
            <= LimiteRetaFinalDias => FaseEvento.RetaFinal,
            _ => FaseEvento.Planejamento,
        };
    }
}
