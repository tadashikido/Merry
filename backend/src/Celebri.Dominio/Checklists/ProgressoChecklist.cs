namespace Casamento.Dominio.Checklists;

public sealed record ProgressoChecklist(int Total, int Concluidas, int Canceladas)
{
    public static readonly ProgressoChecklist Vazio = new(0, 0, 0);

    public int Consideradas => Math.Max(0, Total - Canceladas);

    public int? Percentual => Consideradas == 0 ? null : Concluidas * 100 / Consideradas;
}
