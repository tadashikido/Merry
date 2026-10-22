using Npgsql;
using Testcontainers.PostgreSql;

namespace Celebri.Testes.Integracao.Banco;

public class BancoPostgreSqlFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("evento_testes")
        .WithUsername("evento_testes")
        .WithPassword(Guid.NewGuid().ToString("N"))
        .Build();

    public string StringConexao => _container.GetConnectionString();

    public string CriarStringConexaoBancoNovo()
    {
        var construtor = new NpgsqlConnectionStringBuilder(StringConexao)
        {
            Database = $"evento_{Guid.NewGuid():N}",
        };
        return construtor.ConnectionString;
    }

    public Task InitializeAsync()
    {
        return _container.StartAsync();
    }

    public Task DisposeAsync()
    {
        return _container.DisposeAsync().AsTask();
    }
}

[CollectionDefinition(Nome)]
public class ColecaoBancoPostgreSql : ICollectionFixture<BancoPostgreSqlFixture>
{
    public const string Nome = "Banco PostgreSQL";
}
