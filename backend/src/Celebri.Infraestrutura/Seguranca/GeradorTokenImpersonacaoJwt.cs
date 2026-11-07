using System.Security.Claims;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Impersonacao.Portas;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Celebri.Infraestrutura.Seguranca;

public class GeradorTokenImpersonacaoJwt : IGeradorTokenImpersonacao
{
    public const string TipoToken = "impersonacao";

    private readonly OpcoesJwt _opcoesJwt;
    private readonly OpcoesAutenticacao _opcoesAutenticacao;
    private readonly TimeProvider _relogio;
    private readonly JsonWebTokenHandler _manipulador = new();

    public GeradorTokenImpersonacaoJwt(IOptions<OpcoesJwt> opcoesJwt, IOptions<OpcoesAutenticacao> opcoesAutenticacao, TimeProvider relogio)
    {
        _opcoesJwt = opcoesJwt.Value;
        _opcoesAutenticacao = opcoesAutenticacao.Value;
        _relogio = relogio;
    }

    public TokenAcessoGerado Gerar(Usuario dono, Organizacao organizacao, Guid sessaoId)
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
            Subject = new ClaimsIdentity(MontarClaims(dono, organizacao, sessaoId)),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_opcoesJwt.ObterBytesChave()),
                SecurityAlgorithms.HmacSha256),
        };

        return new TokenAcessoGerado(_manipulador.CreateToken(descritor), expiraEm);
    }

    private static List<Claim> MontarClaims(Usuario dono, Organizacao organizacao, Guid sessaoId)
    {
        return
        [
            new Claim(ClaimsAutenticacao.UsuarioId, dono.Id.ToString()),
            new Claim(ClaimsAutenticacao.OrganizacaoId, organizacao.Id.ToString()),
            new Claim(ClaimsAutenticacao.Papel, dono.Papel.ToString()),
            new Claim(ClaimsAutenticacao.Nome, dono.Nome),
            new Claim(ClaimsAutenticacao.Email, dono.Email),
            new Claim(ClaimsAutenticacao.IdentificadorToken, Guid.NewGuid().ToString()),
            new Claim(ClaimsAutenticacao.TipoIdentidade, TipoToken),
            new Claim(ClaimsAutenticacao.Impersonacao, sessaoId.ToString()),
        ];
    }
}
