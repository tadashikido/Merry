using System.Security.Claims;
using Celebri.Api.Autenticacao;
using Celebri.Api.Tratamento;
using Celebri.Dominio.Excecoes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;

namespace Celebri.Testes.Unidade.Api;

public class AutenticacaoApiUnidadeTestes
{
    [Fact]
    public void CookieRefreshToken_DeveSerHttpOnlySecureStrictERestritoAsRotasDeAutenticacao()
    {
        var opcoes = CookieRefreshToken.CriarOpcoes(DateTimeOffset.UtcNow.AddDays(14));

        Assert.True(opcoes.HttpOnly);
        Assert.True(opcoes.Secure);
        Assert.Equal(SameSiteMode.Strict, opcoes.SameSite);
        Assert.Equal("/api/autenticacao", opcoes.Path);
    }

    [Theory]
    [InlineData(true, true, true)]
    [InlineData(false, true, false)]
    [InlineData(false, false, true)]
    public void FallbackPolicy_DeveExigirAutenticacaoSomenteEmRotasExistentes(bool autenticado, bool comEndpoint, bool esperado)
    {
        var contextoHttp = new DefaultHttpContext();
        if (comEndpoint)
        {
            contextoHttp.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(), "teste"));
        }

        var identidade = autenticado ? new ClaimsIdentity([new Claim("sub", "1")], "Bearer") : new ClaimsIdentity();
        var contexto = new AuthorizationHandlerContext([], new ClaimsPrincipal(identidade), contextoHttp);

        Assert.Equal(esperado, ConfiguracaoAutenticacaoApi.UsuarioAutenticadoOuRotaInexistente(contexto));
    }

    [Fact]
    public void ExcecaoGlobalHandler_DeveMapearNovasExcecoesDeAutenticacao()
    {
        var handler = new ExcecaoGlobalHandler(
            new ServicoProblemasNulo(),
            new HostingEnvironment { EnvironmentName = "Production" },
            NullLogger<ExcecaoGlobalHandler>.Instance);

        Assert.Equal(StatusCodes.Status409Conflict, handler.CriarDetalhesProblema(new ConflitoException("em uso")).Status);
        Assert.Equal(StatusCodes.Status409Conflict, handler.CriarDetalhesProblema(new ConcorrenciaException("x")).Status);
        var credenciais = handler.CriarDetalhesProblema(new CredenciaisInvalidasException("E-mail ou senha inválidos."));
        Assert.Equal(StatusCodes.Status401Unauthorized, credenciais.Status);
        Assert.Equal("E-mail ou senha inválidos.", credenciais.Title);
    }

    private sealed class ServicoProblemasNulo : IProblemDetailsService
    {
        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            return ValueTask.CompletedTask;
        }
    }
}
