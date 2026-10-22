using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.UsuarioAtual;

namespace Celebri.Api.Autenticacao;

public class UsuarioAtualHttp : IUsuarioAtual
{
    private readonly IHttpContextAccessor _acessorContexto;

    public UsuarioAtualHttp(IHttpContextAccessor acessorContexto)
    {
        _acessorContexto = acessorContexto;
    }

    public bool Autenticado => _acessorContexto.HttpContext?.User.Identity?.IsAuthenticated == true;

    public Guid? UsuarioId => LerGuid(ClaimsAutenticacao.UsuarioId);

    public Guid? OrganizacaoId => LerGuid(ClaimsAutenticacao.OrganizacaoId);

    public Guid? CasamentoId => LerGuid(ClaimsAutenticacao.CasamentoId);

    public string? Papel => Autenticado ? _acessorContexto.HttpContext?.User.FindFirst(ClaimsAutenticacao.Papel)?.Value : null;

    private Guid? LerGuid(string tipoClaim)
    {
        if (!Autenticado)
        {
            return null;
        }

        var valor = _acessorContexto.HttpContext?.User.FindFirst(tipoClaim)?.Value;
        return Guid.TryParse(valor, out var id) ? id : null;
    }
}
