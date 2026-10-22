using System.Net;
using System.Text.Json;
using Celebri.Infraestrutura.Persistencia;
using Celebri.Testes.Integracao.Infraestrutura;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Celebri.Testes.Integracao.Banco;

[Collection(ColecaoBancoPostgreSql.Nome)]
public class BancoPostgreSqlTestes
{
    private readonly BancoPostgreSqlFixture _banco;

    public BancoPostgreSqlTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task AplicarMigrations_DeveRegistrarMigrationInicialSemPendencias()
    {
        await using var fabrica = new FabricaApi(_banco.CriarStringConexaoBancoNovo());

        await AplicadorMigrations.AplicarMigrationsAsync(fabrica.Services);

        await using var escopo = fabrica.Services.CreateAsyncScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CelebriDbContext>();
        var aplicadas = await contexto.Database.GetAppliedMigrationsAsync();
        var pendentes = await contexto.Database.GetPendingMigrationsAsync();
        Assert.Contains(aplicadas, migration => migration.EndsWith("_Inicial", StringComparison.Ordinal));
        Assert.Empty(pendentes);
    }

    [Fact]
    public async Task AplicarMigrations_DeveSerIdempotente()
    {
        await using var fabrica = new FabricaApi(_banco.CriarStringConexaoBancoNovo());

        await AplicadorMigrations.AplicarMigrationsAsync(fabrica.Services);
        await AplicadorMigrations.AplicarMigrationsAsync(fabrica.Services);

        await using var escopo = fabrica.Services.CreateAsyncScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CelebriDbContext>();
        Assert.Empty(await contexto.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Inicializacao_ComFlagDeMigrationsLigada_DeveAplicarMigrationsAutomaticamente()
    {
        await using var fabrica = new FabricaApi(
            _banco.CriarStringConexaoBancoNovo(),
            configuracoesAdicionais: new Dictionary<string, string?> { ["Banco:AplicarMigrationsAoIniciar"] = "true" });
        using var cliente = fabrica.CreateClient();

        await using var escopo = fabrica.Services.CreateAsyncScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CelebriDbContext>();
        var aplicadas = await contexto.Database.GetAppliedMigrationsAsync();
        Assert.Contains(aplicadas, migration => migration.EndsWith("_Inicial", StringComparison.Ordinal));
        Assert.Empty(await contexto.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Saude_ComBancoDisponivel_DeveRetornar200Healthy()
    {
        await using var fabrica = new FabricaApi(_banco.StringConexao);
        using var cliente = fabrica.CreateClient();

        var resposta = await cliente.GetAsync("/api/saude");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal("Healthy", documento.RootElement.GetProperty("status").GetString());
    }
}
