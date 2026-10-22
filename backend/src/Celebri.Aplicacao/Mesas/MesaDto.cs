namespace Celebri.Aplicacao.Mesas;

public sealed record MesaDto(
    Guid Id,
    int Numero,
    string? Nome,
    int Capacidade,
    bool Especial,
    int Ocupacao,
    DateTimeOffset CriadoEm,
    DateTimeOffset AtualizadoEm);
