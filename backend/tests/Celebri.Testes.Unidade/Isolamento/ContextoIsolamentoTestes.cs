using System.Security.Claims;
using Celebri.Api.Autenticacao;
using Celebri.Api.Tratamento;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Infraestrutura;
using Celebri.Infraestrutura.Persistencia.Isolamento;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;

namespace Celebri.Testes.Unidade.Isolamento;

public class ContextoIsolamentoTestes
{
    [Fact]
    public void ContextoUsuarioAtual_Autenticado_DeveRetornarOrganizacaoDaClaim()
    {
        var organizacaoId = Guid.NewGuid();
        var contexto = new ContextoIsolamentoUsuarioAtual(CriarUsuarioAtual(autenticado: true, organizacaoId.ToString()));

        Assert.Equal(organizacaoId, contexto.OrganizacaoId);
    }

    [Fact]
    public void ContextoUsuarioAtual_NaoAutenticado_DeveRetornarNuloMesmoComClaim()
    {
        var contexto = new ContextoIsolamentoUsuarioAtual(CriarUsuarioAtual(autenticado: false, Guid.NewGuid().ToString()));

        Assert.Null(contexto.OrganizacaoId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("nao-e-guid")]
    public void ContextoUsuarioAtual_ClaimAusenteOuInvalida_DeveRetornarNulo(string? claim)
    {
        var contexto = new ContextoIsolamentoUsuarioAtual(CriarUsuarioAtual(autenticado: true, claim));

        Assert.Null(contexto.OrganizacaoId);
    }

    [Fact]
    public void ContextoSemOrganizacao_DeveSempreRetornarNulo()
    {
        Assert.Null(new ContextoIsolamentoSemOrganizacao().OrganizacaoId);
    }

    [Fact]
    public void AdicionarInfraestrutura_SemRegistroDaAplicacao_DeveUsarContextoFailClosed()
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>("ConnectionStrings:Principal", "Host=localhost;Database=casamento_teste")])
            .Build();
        var servicos = new ServiceCollection();

        servicos.AdicionarInfraestrutura(configuracao);
        using var provedor = servicos.BuildServiceProvider();
        using var escopo = provedor.CreateScope();

        Assert.IsType<ContextoIsolamentoSemOrganizacao>(escopo.ServiceProvider.GetRequiredService<IContextoIsolamento>());
    }

    [Fact]
    public void ExcecaoGlobalHandler_ViolacaoIsolamento_DeveRetornar404SemDetalhes()
    {
        var handler = new ExcecaoGlobalHandler(
            new ProblemDetailsServiceFalso(),
            new HostingEnvironment { EnvironmentName = Environments.Development },
            NullLogger<ExcecaoGlobalHandler>.Instance);

        var detalhes = handler.CriarDetalhesProblema(new ViolacaoIsolamentoException("Convidado"));

        Assert.Equal(StatusCodes.Status404NotFound, detalhes.Status);
        Assert.Equal(ExcecaoGlobalHandler.TituloNaoEncontrado, detalhes.Title);
        Assert.Null(detalhes.Detail);
    }

    private static IUsuarioAtual CriarUsuarioAtual(bool autenticado, string? organizacaoId)
    {
        var claims = new List<Claim> { new(ClaimsAutenticacao.UsuarioId, Guid.NewGuid().ToString()) };
        if (organizacaoId is not null)
        {
            claims.Add(new Claim(ClaimsAutenticacao.OrganizacaoId, organizacaoId));
        }

        var identidade = autenticado ? new ClaimsIdentity(claims, "Bearer") : new ClaimsIdentity(claims);
        var acessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identidade) } };
        return new UsuarioAtualHttp(acessor);
    }

    private sealed class ProblemDetailsServiceFalso : IProblemDetailsService
    {
        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            return ValueTask.CompletedTask;
        }
    }
}
