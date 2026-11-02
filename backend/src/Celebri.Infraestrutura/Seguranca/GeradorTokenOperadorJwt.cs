using System.Security.Claims;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Operadores;
using Celebri.Aplicacao.Operadores.Portas;
using Celebri.Dominio.Operadores;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Celebri.Infraestrutura.Seguranca;

public class GeradorTokenOperadorJwt : IGeradorTokenOperador
{
    private readonly OpcoesJwt _opcoesJwt;
    private readonly OpcoesAutenticacao _opcoesAutenticacao;
    private readonly TimeProvider _relogio;
    private readonly JsonWebTokenHandler _manipulador = new();

    public GeradorTokenOperadorJwt(IOptions<OpcoesJwt> opcoesJwt, IOptions<OpcoesAutenticacao> opcoesAutenticacao, TimeProvider relogio)
    {
        _opcoesJwt = opcoesJwt.Value;
        _opcoesAutenticacao = opcoesAutenticacao.Value;
        _relogio = relogio;
    }

    public TokenAcessoGerado Gerar(OperadorPlataforma operador)
    {
        var agora = _relogio.GetUtcNow();
        var expiraEm = agora.AddMinutes(_opcoesAutenticacao.ValidadeTokenAcessoMinutos);

        var descritor = new SecurityTokenDescriptor
        {
            Issuer = _opcoesJwt.Emissor,
            Audience = _opcoesJwt.AudienciaOperador,
            IssuedAt = agora.UtcDateTime,
            NotBefore = agora.UtcDateTime,
            Expires = expiraEm.UtcDateTime,
            Subject = new ClaimsIdentity(MontarClaims(operador)),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_opcoesJwt.ObterBytesChave()),
                SecurityAlgorithms.HmacSha256),
        };

        return new TokenAcessoGerado(_manipulador.CreateToken(descritor), expiraEm);
    }

    private static List<Claim> MontarClaims(OperadorPlataforma operador)
    {
        return
        [
            new Claim(ClaimsAutenticacao.UsuarioId, operador.Id.ToString()),
            new Claim(ClaimsAutenticacao.Papel, PapeisOperador.Papel),
            new Claim(ClaimsAutenticacao.Nome, operador.Nome),
            new Claim(ClaimsAutenticacao.Email, operador.Email),
            new Claim(ClaimsAutenticacao.IdentificadorToken, Guid.NewGuid().ToString()),
            new Claim(ClaimsAutenticacao.TipoIdentidade, PapeisOperador.TipoToken),
        ];
    }
}
