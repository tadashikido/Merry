using System.Security.Claims;
using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.Autenticacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Casamento.Testes.Unidade.Casamentos;

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
    [InlineData(PoliticasAutorizacao.ListarCasamentos)]
    [InlineData(PoliticasAutorizacao.ConsultarCasamentos)]
    [InlineData(PoliticasAutorizacao.GerenciarCasamentos)]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados)]
    [InlineData(PoliticasAutorizacao.GerenciarConvidados)]
    [InlineData(PoliticasAutorizacao.ConsultarRestricoesAlimentares)]
    [InlineData(PoliticasAutorizacao.GerenciarRestricoesAlimentares)]
    [InlineData(PoliticasAutorizacao.GerenciarAcessoCasal)]
    public async Task Dono_DeveSerAutorizado(string politica)
    {
        var resultado = await CriarServico().AuthorizeAsync(Usuario("Dono"), politica);

        Assert.True(resultado.Succeeded);
    }

    [Theory]
    [InlineData(PoliticasAutorizacao.ConsultarCasamentos)]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados)]
    [InlineData(PoliticasAutorizacao.GerenciarConvidados)]
    public async Task Casal_DeveSerAutorizadoNoQueEhDoCasamento(string politica)
    {
        var resultado = await CriarServico().AuthorizeAsync(Usuario("Casal"), politica);

        Assert.True(resultado.Succeeded);
    }

    [Theory]
    [InlineData(PoliticasAutorizacao.ListarCasamentos, "Casal")]
    [InlineData(PoliticasAutorizacao.GerenciarCasamentos, "Casal")]
    [InlineData(PoliticasAutorizacao.ConsultarRestricoesAlimentares, "Casal")]
    [InlineData(PoliticasAutorizacao.GerenciarRestricoesAlimentares, "Casal")]
    [InlineData(PoliticasAutorizacao.GerenciarAcessoCasal, "Casal")]
    [InlineData(PoliticasAutorizacao.GerenciarCasamentos, "dono")]
    [InlineData(PoliticasAutorizacao.ConsultarConvidados, "casal")]
    [InlineData(PoliticasAutorizacao.GerenciarCasamentos, null)]
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
        var resultado = await CriarServico().AuthorizeAsync(Usuario("Dono", autenticado: false), PoliticasAutorizacao.GerenciarCasamentos);

        Assert.False(resultado.Succeeded);
    }

    [Fact]
    public void PapeisPorPolitica_DeveSeguirAMatrizDoCasal()
    {
        var somenteDono = new[]
        {
            PoliticasAutorizacao.ListarCasamentos,
            PoliticasAutorizacao.GerenciarCasamentos,
            PoliticasAutorizacao.ConsultarRestricoesAlimentares,
            PoliticasAutorizacao.GerenciarRestricoesAlimentares,
            PoliticasAutorizacao.GerenciarAcessoCasal,
            PoliticasAutorizacao.GerenciarTarefas,
            PoliticasAutorizacao.ConsultarPendenciasTarefas,
            PoliticasAutorizacao.GerenciarModelosChecklist,
            PoliticasAutorizacao.GerenciarChecklist,
            PoliticasAutorizacao.GerenciarFornecedores,
            PoliticasAutorizacao.GerenciarFornecedoresCasamento,
            PoliticasAutorizacao.GerenciarFinanceiroCasamento,
            PoliticasAutorizacao.ConsultarAlertasPagamentos,
            PoliticasAutorizacao.GerenciarCronograma,
            PoliticasAutorizacao.GerenciarModelosCronograma,
        };
        var donoECasal = new[]
        {
            PoliticasAutorizacao.ConsultarCasamentos,
            PoliticasAutorizacao.ConsultarConvidados,
            PoliticasAutorizacao.GerenciarConvidados,
            PoliticasAutorizacao.ConsultarTarefas,
            PoliticasAutorizacao.AlterarStatusTarefas,
            PoliticasAutorizacao.ConsultarFornecedoresCasamento,
            PoliticasAutorizacao.ConsultarFinanceiroCasamento,
            PoliticasAutorizacao.ConsultarCronograma,
            PoliticasAutorizacao.ConsultarMesas,
            PoliticasAutorizacao.GerenciarMesas,
        };

        Assert.Equal(somenteDono.Length + donoECasal.Length, PoliticasAutorizacao.PapeisPorPolitica.Count);
        Assert.All(somenteDono, politica => Assert.Equal(["Dono"], PoliticasAutorizacao.PapeisPorPolitica[politica]));
        Assert.All(donoECasal, politica => Assert.Equal(["Dono", "Casal"], PoliticasAutorizacao.PapeisPorPolitica[politica]));
    }
}
