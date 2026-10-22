namespace Casamento.Aplicacao.Autenticacao;

public sealed record OrganizacaoResumoDto(Guid Id, string Nome);

public sealed record UsuarioAutenticadoDto(
    Guid Id,
    string Nome,
    string Email,
    string Papel,
    OrganizacaoResumoDto Organizacao,
    Guid? CasamentoId);

public sealed record SessaoDto(string TokenAcesso, DateTimeOffset ExpiraEm, UsuarioAutenticadoDto Usuario);

public sealed record SolicitacaoRecuperacaoDto(string Mensagem);

public sealed record ResultadoAutenticacao(SessaoDto Sessao, string RefreshToken, DateTimeOffset RefreshTokenExpiraEm);
