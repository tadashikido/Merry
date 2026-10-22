using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Infraestrutura;
using Celebri.Infraestrutura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Celebri.Testes.Unidade.Infraestrutura;

public class ConfiguracaoInfraestruturaTestes
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void AdicionarInfraestrutura_SemStringDeConexao_DeveFalharComMensagemClara(string? stringConexao)
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>("ConnectionStrings:Principal", stringConexao)])
            .Build();

        var excecao = Assert.Throws<InvalidOperationException>(() => new ServiceCollection().AdicionarInfraestrutura(configuracao));

        Assert.Contains("ConnectionStrings__Principal", excecao.Message);
    }

    [Fact]
    public void AdicionarInfraestrutura_ComStringDeConexao_DeveRegistrarDbContextComNpgsql()
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>("ConnectionStrings:Principal", "Host=localhost;Database=evento_teste")])
            .Build();
        var servicos = new ServiceCollection();
        servicos.AddLogging();

        servicos.AdicionarInfraestrutura(configuracao);
        using var provedor = servicos.BuildServiceProvider();
        using var escopo = provedor.CreateScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CelebriDbContext>();

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", contexto.Database.ProviderName);
    }

    [Fact]
    public void CelebriDbContextFactory_DeveCriarContextoParaDesignSemSegredos()
    {
        using var contexto = new CelebriDbContextFactory().CreateDbContext([]);

        var stringConexao = contexto.Database.GetConnectionString();

        Assert.NotNull(stringConexao);
        Assert.DoesNotContain("Password", stringConexao, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CelebriDbContext_DeveConterMigrationInicial()
    {
        using var contexto = new CelebriDbContextFactory().CreateDbContext([]);

        var migrations = contexto.Database.GetMigrations();

        Assert.Contains(migrations, migration => migration.EndsWith("_Inicial", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(null, null, 30)]
    [InlineData(null, "45", 45)]
    [InlineData("60", "45", 60)]
    [InlineData("60", null, 60)]
    public void RetencaoDadosSensiveis_DeveLerAChaveNovaEAceitarANomeAntigoSoQuandoANovaFaltar(string? diasAposEvento, string? chaveLegada, int esperado)
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection(
            [
                new KeyValuePair<string, string?>($"{OpcoesRetencaoDadosSensiveis.Secao}:{nameof(OpcoesRetencaoDadosSensiveis.DiasAposEvento)}", diasAposEvento),
                new KeyValuePair<string, string?>($"{OpcoesRetencaoDadosSensiveis.Secao}:{OpcoesRetencaoDadosSensiveis.ChaveLegadaDiasAposEvento}", chaveLegada),
            ])
            .Build();
        var opcoes = new OpcoesRetencaoDadosSensiveis();
        var secao = configuracao.GetSection(OpcoesRetencaoDadosSensiveis.Secao);
        secao.Bind(opcoes);

        ConfiguracaoInfraestrutura.AplicarChaveLegadaRetencao(opcoes, secao);

        Assert.Equal(esperado, opcoes.DiasAposEvento);
    }
}
