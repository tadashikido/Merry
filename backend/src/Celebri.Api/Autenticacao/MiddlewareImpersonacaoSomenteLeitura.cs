using Celebri.Aplicacao.Autenticacao;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Autenticacao;

public class MiddlewareImpersonacaoSomenteLeitura
{
    public const string MensagemSomenteLeitura = "Visualização somente leitura.";

    private static readonly HashSet<string> MetodosLeitura = new(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD", "OPTIONS" };

    private readonly RequestDelegate _proximo;

    public MiddlewareImpersonacaoSomenteLeitura(RequestDelegate proximo)
    {
        _proximo = proximo;
    }

    public async Task InvokeAsync(HttpContext contexto)
    {
        var usuario = contexto.User;

        if (usuario.Identity?.IsAuthenticated == true
            && usuario.FindFirst(ClaimsAutenticacao.Impersonacao) is not null
            && !MetodosLeitura.Contains(contexto.Request.Method))
        {
            contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
            var servicoProblemas = contexto.RequestServices.GetRequiredService<IProblemDetailsService>();
            await servicoProblemas.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = contexto,
                ProblemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = MensagemSomenteLeitura,
                },
            });
            return;
        }

        await _proximo(contexto);
    }
}
