using System.Security.Claims;
using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Autenticacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Celebri.Testes.Unidade.Eventos;

public class PoliticasAutorizacaoTestes
{
    private static IAuthorizationService CriarServico()
    {
        var servicos = new ServiceCollection();
        servicos.AddLogging();
        servicos.AddAuthorization(PoliticasAutorizacao.Registrar);
        return servicos.BuildServiceProvider().GetRequiredService<IAuthorizationService>();
    }

    private static ClaimsPrincipal Usuario(string? papel, bool autenticado = true)
    {
        var claims = papel is null ? [] : new[] { new Claim(ClaimsAutenticacao.Papel, papel) };
        var identidade = autenticado
            ? new ClaimsIdentity(claims, "Teste", ClaimsAutenticacao.Nome, ClaimsAutenticacao.Papel)
            : new ClaimsIdentity(claims);
        return new ClaimsPrincipal(identidade);
    }

    [Theory]
    [InlineData(PoliticasAutorizacao.ListarEventos)]
    [InlineData(PoliticasAutorizacao.ConsultarEventos)]
    [InlineData(PoliticasAutorizacao.GerenciarEventos)]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados)]
    [InlineData(PoliticasAutorizacao.GerenciarConvidados)]
    [InlineData(PoliticasAutorizacao.ConsultarRestricoesAlimentares)]
    [InlineData(PoliticasAutorizacao.GerenciarRestricoesAlimentares)]
    [InlineData(PoliticasAutorizacao.GerenciarAcessoAnfitriao)]
    public async Task Dono_DeveSerAutorizado(string politica)
    {
        var resultado = await CriarServico().AuthorizeAsync(Usuario("Dono"), politica);

        Assert.True(resultado.Succeeded);
    }

    [Theory]
    [InlineData(PoliticasAutorizacao.ConsultarEventos)]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados)]
    [InlineData(PoliticasAutorizacao.GerenciarConvidados)]
    public async Task Anfitriao_DeveSerAutorizadoNoQueEhDoEvento(string politica)
    {
        var resultado = await CriarServico().AuthorizeAsync(Usuario("Anfitriao"), politica);

        Assert.True(resultado.Succeeded);
    }

    [Theory]
    [InlineData(PoliticasAutorizacao.ListarEventos, "Anfitriao")]
    [InlineData(PoliticasAutorizacao.GerenciarEventos, "Anfitriao")]
    [InlineData(PoliticasAutorizacao.ConsultarRestricoesAlimentares, "Anfitriao")]
    [InlineData(PoliticasAutorizacao.GerenciarRestricoesAlimentares, "Anfitriao")]
    [InlineData(PoliticasAutorizacao.GerenciarAcessoAnfitriao, "Anfitriao")]
    [InlineData(PoliticasAutorizacao.GerenciarEventos, "dono")]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados, "anfitriao")]
    [InlineData(PoliticasAutorizacao.GerenciarEventos, null)]
    [InlineData(PoliticasAutorizacao.GerenciarConvidados, null)]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados, "Membro")]
    public async Task OutroPapelOuSemPapel_DeveSerNegado(string politica, string? papel)
    {
        var resultado = await CriarServico().AuthorizeAsync(Usuario(papel), politica);

        Assert.False(resultado.Succeeded);
    }

    [Fact]
    public async Task UsuarioNaoAutenticadoComPapelDono_DeveSerNegado()
    {
        var resultado = await CriarServico().AuthorizeAsync(Usuario("Dono", autenticado: false), PoliticasAutorizacao.GerenciarEventos);

        Assert.False(resultado.Succeeded);
    }

    [Fact]
    public void PapeisPorPolitica_DeveSeguirAMatrizDoAnfitriao()
    {
        var somenteDono = new[]
        {
            PoliticasAutorizacao.ListarEventos,
            PoliticasAutorizacao.GerenciarEventos,
            PoliticasAutorizacao.ConsultarRestricoesAlimentares,
            PoliticasAutorizacao.GerenciarRestricoesAlimentares,
            PoliticasAutorizacao.GerenciarAcessoAnfitriao,
            PoliticasAutorizacao.GerenciarTarefas,
            PoliticasAutorizacao.ConsultarPendenciasTarefas,
            PoliticasAutorizacao.GerenciarModelosChecklist,
            PoliticasAutorizacao.GerenciarChecklist,
            PoliticasAutorizacao.GerenciarFornecedores,
            PoliticasAutorizacao.GerenciarFornecedoresEvento,
            PoliticasAutorizacao.GerenciarFinanceiroEvento,
            PoliticasAutorizacao.ConsultarAlertasPagamentos,
            PoliticasAutorizacao.GerenciarCronograma,
            PoliticasAutorizacao.GerenciarModelosCronograma,
        };
        var donoEAnfitriao = new[]
        {
            PoliticasAutorizacao.ConsultarEventos,
            PoliticasAutorizacao.ConsultarConvidados,
            PoliticasAutorizacao.GerenciarConvidados,
            PoliticasAutorizacao.ConsultarTarefas,
            PoliticasAutorizacao.AlterarStatusTarefas,
            PoliticasAutorizacao.ConsultarFornecedoresEvento,
            PoliticasAutorizacao.ConsultarFinanceiroEvento,
            PoliticasAutorizacao.ConsultarCronograma,
            PoliticasAutorizacao.ConsultarMesas,
            PoliticasAutorizacao.GerenciarMesas,
        };

        Assert.Equal(somenteDono.Length + donoEAnfitriao.Length, PoliticasAutorizacao.PapeisPorPolitica.Count);
        Assert.All(somenteDono, politica => Assert.Equal(["Dono"], PoliticasAutorizacao.PapeisPorPolitica[politica]));
        Assert.All(donoEAnfitriao, politica => Assert.Equal(["Dono", "Anfitriao"], PoliticasAutorizacao.PapeisPorPolitica[politica]));
    }
}
