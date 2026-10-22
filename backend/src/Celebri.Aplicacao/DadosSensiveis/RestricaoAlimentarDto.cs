namespace Celebri.Aplicacao.DadosSensiveis;

public sealed record RestricaoAlimentarDto(
    IReadOnlyList<string> Tipos,
    string? OutraRestricao,
    string? NecessidadeEspecial,
    string OrigemConsentimento,
    DateTimeOffset ConsentidoEm);
