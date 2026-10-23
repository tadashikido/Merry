using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Infraestrutura;
using Celebri.Infraestrutura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

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
        KeyValuePair<string, string?>[] chavesInformadas =
        [
            new($"{OpcoesRetencaoDadosSensiveis.Secao}:{nameof(OpcoesRetencaoDadosSensiveis.DiasAposEvento)}", diasAposEvento),
            new($"{OpcoesRetencaoDadosSensiveis.Secao}:{OpcoesRetencaoDadosSensiveis.ChaveLegadaDiasAposEvento}", chaveLegada),
        ];
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection(chavesInformadas.Where(chave => chave.Value is not null))
            .Build();
        var opcoes = new OpcoesRetencaoDadosSensiveis();
        var secao = configuracao.GetSection(OpcoesRetencaoDadosSensiveis.Secao);
        secao.Bind(opcoes);

        ConfiguracaoInfraestrutura.AplicarChaveLegadaRetencao(opcoes, secao);

        Assert.Equal(esperado, opcoes.DiasAposEvento);
    }

    [Fact]
    public void ConfigurarPostgreSql_DeveDesligarCriptografiaGssMantendoDemaisParametros()
    {
        var opcoes = new DbContextOptionsBuilder<CelebriDbContext>();

        opcoes.ConfigurarPostgreSql("Host=db;Port=5432;Database=celebri;Username=celebri;Password=segredo");

        var stringConexao = RelationalOptionsExtension.Extract(opcoes.Options).ConnectionString;
        var conexao = new NpgsqlConnectionStringBuilder(stringConexao);
        Assert.Equal(GssEncryptionMode.Disable, conexao.GssEncryptionMode);
        Assert.Equal("db", conexao.Host);
        Assert.Equal(5432, conexao.Port);
        Assert.Equal("celebri", conexao.Database);
        Assert.Equal("celebri", conexao.Username);
        Assert.Equal("segredo", conexao.Password);
    }
}
