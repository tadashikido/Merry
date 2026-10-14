namespace Casamento.Dominio.Casamentos;

public static class CalculadoraFaseCasamento
{
    public const int LimiteRetaFinalDias = 90;
    public const int LimiteSemanaDias = 7;

    public static FaseCasamento Calcular(int diasRestantes)
    {
        return diasRestantes switch
        {
            < 0 => FaseCasamento.Realizado,
            0 => FaseCasamento.DiaDoCasamento,
            <= LimiteSemanaDias => FaseCasamento.SemanaDoCasamento,
            <= LimiteRetaFinalDias => FaseCasamento.RetaFinal,
            _ => FaseCasamento.Planejamento,
        };
    }
}
