using System.Security.Claims;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Usuarios;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Celebri.Api.Autenticacao;

public static class ValidadorSessaoAnfitriao
{
    public const string MotivoSessaoEncerrada = "Acesso dos anfitriões revogado ou inexistente.";

    public static async Task ValidarAsync(TokenValidatedContext contexto)
    {
        ArgumentNullException.ThrowIfNull(contexto);

        var principal = contexto.Principal;
        if (principal?.FindFirstValue(ClaimsAutenticacao.Papel) != nameof(PapelUsuario.Anfitriao))
        {
            return;
        }

        if (!Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.UsuarioId), out var usuarioId)
            || !Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.EventoId), out var eventoId)
            || !Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.OrganizacaoId), out var organizacaoId))
        {
            contexto.Fail(MotivoSessaoEncerrada);
            return;
        }

        var usuarios = contexto.HttpContext.RequestServices.GetRequiredService<IUsuarioRepository>();
        var usuario = await usuarios.ObterPorIdAsync(usuarioId, contexto.HttpContext.RequestAborted);

        var valido = usuario is { Ativo: true, Papel: PapelUsuario.Anfitriao }
            && usuario.EventoId == eventoId
            && usuario.OrganizacaoId == organizacaoId;

        if (!valido)
        {
            contexto.Fail(MotivoSessaoEncerrada);
        }
    }
}
