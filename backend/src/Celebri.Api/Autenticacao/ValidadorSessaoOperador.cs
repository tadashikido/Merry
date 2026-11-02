using System.Security.Claims;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Operadores;
using Celebri.Aplicacao.Persistencia;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Celebri.Api.Autenticacao;

public static class ValidadorSessaoOperador
{
    public const string MotivoSessaoEncerrada = "Sessão de operador revogada ou inexistente.";

    public static async Task ValidarAsync(TokenValidatedContext contexto)
    {
        ArgumentNullException.ThrowIfNull(contexto);

        var principal = contexto.Principal;
        if (principal is null)
        {
            contexto.Fail(MotivoSessaoEncerrada);
            return;
        }

        var papel = principal.FindFirstValue(ClaimsAutenticacao.Papel);
        if (papel != PapeisOperador.Papel
            || !Guid.TryParse(principal.FindFirstValue(ClaimsAutenticacao.UsuarioId), out var operadorId))
        {
            contexto.Fail(MotivoSessaoEncerrada);
            return;
        }

        var repositorio = contexto.HttpContext.RequestServices.GetRequiredService<IOperadorPlataformaRepository>();
        var operador = await repositorio.ObterPorIdAsync(operadorId, contexto.HttpContext.RequestAborted);

        if (operador is null || !operador.Ativo)
        {
            contexto.Fail(MotivoSessaoEncerrada);
        }
    }
}
