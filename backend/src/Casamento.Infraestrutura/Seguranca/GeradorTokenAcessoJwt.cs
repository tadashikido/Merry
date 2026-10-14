using System.Security.Claims;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Autenticacao.Portas;
using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Usuarios;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Casamento.Infraestrutura.Seguranca;

public class GeradorTokenAcessoJwt : IGeradorTokenAcesso
{
    private readonly OpcoesJwt _opcoesJwt;
    private readonly OpcoesAutenticacao _opcoesAutenticacao;
    private readonly TimeProvider _relogio;
    private readonly JsonWebTokenHandler _manipulador = new();

    public GeradorTokenAcessoJwt(IOptions<OpcoesJwt> opcoesJwt, IOptions<OpcoesAutenticacao> opcoesAutenticacao, TimeProvider relogio)
    {
        _opcoesJwt = opcoesJwt.Value;
        _opcoesAutenticacao = opcoesAutenticacao.Value;
        _relogio = relogio;
    }

    public TokenAcessoGerado Gerar(Usuario usuario, Organizacao organizacao)
    {
        var agora = _relogio.GetUtcNow();
        var expiraEm = agora.AddMinutes(_opcoesAutenticacao.ValidadeTokenAcessoMinutos);

        var descritor = new SecurityTokenDescriptor
        {
            Issuer = _opcoesJwt.Emissor,
            Audience = _opcoesJwt.Audiencia,
            IssuedAt = agora.UtcDateTime,
            NotBefore = agora.UtcDateTime,
            Expires = expiraEm.UtcDateTime,
            Subject = new ClaimsIdentity(MontarClaims(usuario, organizacao)),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_opcoesJwt.ObterBytesChave()),
                SecurityAlgorithms.HmacSha256),
        };

        return new TokenAcessoGerado(_manipulador.CreateToken(descritor), expiraEm);
    }

    private static List<Claim> MontarClaims(Usuario usuario, Organizacao organizacao)
    {
        var claims = new List<Claim>
        {
            new(ClaimsAutenticacao.UsuarioId, usuario.Id.ToString()),
            new(ClaimsAutenticacao.OrganizacaoId, organizacao.Id.ToString()),
            new(ClaimsAutenticacao.Papel, usuario.Papel.ToString()),
            new(ClaimsAutenticacao.Nome, usuario.Nome),
            new(ClaimsAutenticacao.Email, usuario.Email),
            new(ClaimsAutenticacao.IdentificadorToken, Guid.NewGuid().ToString()),
        };

        if (usuario.CasamentoId is { } casamentoId)
        {
            claims.Add(new Claim(ClaimsAutenticacao.CasamentoId, casamentoId.ToString()));
        }

        return claims;
    }
}
