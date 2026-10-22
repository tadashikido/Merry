namespace Casamento.Aplicacao.Mesas;

public sealed record PessoaMesaDto(
    Guid Id,
    string Nome,
    string FaixaEtaria,
    bool Acompanhante,
    Guid ConviteId,
    string Convite,
    string? Grupo,
    Guid? MesaId);
