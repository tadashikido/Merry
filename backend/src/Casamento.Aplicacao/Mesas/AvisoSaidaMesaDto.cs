namespace Casamento.Aplicacao.Mesas;

public sealed record AvisoSaidaMesaDto(
    Guid ConvidadoId,
    string Nome,
    string Convite,
    string Resposta,
    Guid? MesaId,
    int? MesaNumero,
    string? MesaNome,
    bool? MesaEspecial,
    DateTimeOffset SaiuEm);
