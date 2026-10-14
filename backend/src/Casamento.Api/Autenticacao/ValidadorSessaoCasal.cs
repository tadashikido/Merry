using System.Security.Claims;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Usuarios;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Casamento.Api.Autenticacao;

public static class ValidadorSessaoCasal
{
    public const string MotivoSessaoEncerrada = "Acesso do casal revogado ou inexistente.";

    public static async Task ValidarAsync(TokenValidatedContext contexto)
    {
        ArgumentNullException.ThrowIfNull(contexto);

        var principal = contexto.Principal;
        if (principal?.FindFirstValue(ClaimsAutenticacao.Papel) != nameof(PapelUsuario.Casal))
        {
            return;
        }

        if (!Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.UsuarioId), out var usuarioId)
            || !Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.CasamentoId), out var casamentoId)
            || !Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.OrganizacaoId), out var organizacaoId))
        {
            contexto.Fail(MotivoSessaoEncerrada);
            return;
        }

        var usuarios = contexto.HttpContext.RequestServices.GetRequiredService<IUsuarioRepository>();
        var usuario = await usuarios.ObterPorIdAsync(usuarioId, contexto.HttpContext.RequestAborted);

        var valido = usuario is { Ativo: true, Papel: PapelUsuario.Casal }
            && usuario.CasamentoId == casamentoId
            && usuario.OrganizacaoId == organizacaoId;

        if (!valido)
        {
            contexto.Fail(MotivoSessaoEncerrada);
        }
    }
}
