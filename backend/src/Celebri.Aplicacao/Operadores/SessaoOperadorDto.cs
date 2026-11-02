namespace Celebri.Aplicacao.Operadores;

public sealed record OperadorAutenticadoDto(Guid Id, string Nome, string Email);

public sealed record SessaoOperadorDto(string TokenAcesso, DateTimeOffset ExpiraEm, OperadorAutenticadoDto Operador);

public sealed record ResultadoAutenticacaoOperador(SessaoOperadorDto Sessao, string RefreshToken, DateTimeOffset RefreshTokenExpiraEm);
