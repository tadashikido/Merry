namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record ConvitePreVisualizadoDto(
    string Nome,
    string? Grupo,
    int LimiteAcompanhantes,
    bool Valido,
    IReadOnlyList<PessoaPreVisualizadaDto> Pessoas);
