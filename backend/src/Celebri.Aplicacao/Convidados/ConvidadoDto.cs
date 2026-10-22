namespace Celebri.Aplicacao.Convidados;

public sealed record ConvidadoDto(
    Guid Id,
    string Nome,
    string? Telefone,
    string? Email,
    string FaixaEtaria,
    string Resposta,
    bool Acompanhante,
    bool? PossuiRestricao,
    Guid? MesaId);
