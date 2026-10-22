using Celebri.Api.Middlewares;
using Microsoft.AspNetCore.Http;

namespace Celebri.Testes.Unidade.Api;

public class CabecalhosSegurancaMiddlewareTestes
{
    [Fact]
    public void AplicarCabecalhos_DeveDefinirTodosOsCabecalhosDeSeguranca()
    {
        var cabecalhos = new HeaderDictionary();

        CabecalhosSegurancaMiddleware.AplicarCabecalhos(cabecalhos);

        Assert.Equal("nosniff", cabecalhos["X-Content-Type-Options"]);
        Assert.Equal("DENY", cabecalhos["X-Frame-Options"]);
        Assert.Equal("no-referrer", cabecalhos["Referrer-Policy"]);
        Assert.Equal("default-src 'none'; frame-ancestors 'none'", cabecalhos["Content-Security-Policy"]);
        Assert.Contains("camera=()", cabecalhos["Permissions-Policy"].ToString());
        Assert.Equal("same-origin", cabecalhos["Cross-Origin-Opener-Policy"]);
        Assert.Equal("same-origin", cabecalhos["Cross-Origin-Resource-Policy"]);
    }

    [Fact]
    public void AplicarCabecalhos_DeveRemoverCabecalhosQueExpoemTecnologia()
    {
        var cabecalhos = new HeaderDictionary
        {
            ["Server"] = "Kestrel",
            ["X-Powered-By"] = "ASP.NET",
        };

        CabecalhosSegurancaMiddleware.AplicarCabecalhos(cabecalhos);

        Assert.False(cabecalhos.ContainsKey("Server"));
        Assert.False(cabecalhos.ContainsKey("X-Powered-By"));
    }

    [Fact]
    public async Task InvokeAsync_DeveChamarProximoMiddleware()
    {
        var proximoChamado = false;
        var middleware = new CabecalhosSegurancaMiddleware(_ =>
        {
            proximoChamado = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(new DefaultHttpContext());

        Assert.True(proximoChamado);
    }
}
