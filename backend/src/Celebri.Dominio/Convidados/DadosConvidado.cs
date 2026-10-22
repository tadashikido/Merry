namespace Celebri.Dominio.Convidados;

public sealed record DadosConvidado(
    Guid? Id,
    string? Nome,
    string? Telefone,
    string? Email,
    FaixaEtaria FaixaEtaria,
    RespostaRsvp Resposta);
