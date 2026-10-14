namespace Casamento.Aplicacao.Convidados;

public sealed record ResumoConvidados(
    IReadOnlyList<ContagemConvidados> Contagens,
    int Convites,
    int AcompanhantesPermitidos);
