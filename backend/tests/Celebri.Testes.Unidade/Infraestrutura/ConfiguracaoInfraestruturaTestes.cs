using Casamento.Infraestrutura;
using Casamento.Infraestrutura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Casamento.Testes.Unidade.Infraestrutura;

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
            .AddInMemoryCollection([new KeyValuePair<string, string?>("ConnectionStrings:Principal", "Host=localhost;Database=casamento_teste")])
            .Build();
        var servicos = new ServiceCollection();
        servicos.AddLogging();

        servicos.AdicionarInfraestrutura(configuracao);
        using var provedor = servicos.BuildServiceProvider();
        using var escopo = provedor.CreateScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CasamentoDbContext>();

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", contexto.Database.ProviderName);
    }

    [Fact]
    public void CasamentoDbContextFactory_DeveCriarContextoParaDesignSemSegredos()
    {
        using var contexto = new CasamentoDbContextFactory().CreateDbContext([]);

        var stringConexao = contexto.Database.GetConnectionString();

        Assert.NotNull(stringConexao);
        Assert.DoesNotContain("Password", stringConexao, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CasamentoDbContext_DeveConterMigrationInicial()
    {
        using var contexto = new CasamentoDbContextFactory().CreateDbContext([]);

        var migrations = contexto.Database.GetMigrations();

        Assert.Contains(migrations, migration => migration.EndsWith("_Inicial", StringComparison.Ordinal));
    }
}
