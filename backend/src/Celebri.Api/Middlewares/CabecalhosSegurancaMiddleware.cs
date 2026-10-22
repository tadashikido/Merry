namespace Casamento.Api.Middlewares;

public class CabecalhosSegurancaMiddleware
{
    private readonly RequestDelegate _proximo;

    public CabecalhosSegurancaMiddleware(RequestDelegate proximo)
    {
        _proximo = proximo;
    }

    public Task InvokeAsync(HttpContext contexto)
    {
        contexto.Response.OnStarting(() =>
        {
            AplicarCabecalhos(contexto.Response.Headers);
            return Task.CompletedTask;
        });

        return _proximo(contexto);
    }

    public static void AplicarCabecalhos(IHeaderDictionary cabecalhos)
    {
        cabecalhos["X-Content-Type-Options"] = "nosniff";
        cabecalhos["X-Frame-Options"] = "DENY";
        cabecalhos["Referrer-Policy"] = "no-referrer";
        cabecalhos["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        cabecalhos["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
        cabecalhos["Cross-Origin-Opener-Policy"] = "same-origin";
        cabecalhos["Cross-Origin-Resource-Policy"] = "same-origin";
        cabecalhos.Remove("Server");
        cabecalhos.Remove("X-Powered-By");
    }
}
