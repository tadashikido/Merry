namespace Casamento.Aplicacao.Mesas;

public sealed record TotaisMesasDto(
    int Mesas,
    int CapacidadeTotal,
    int Confirmados,
    int Acomodados,
    int LugaresLivres,
    int SemMesa);
