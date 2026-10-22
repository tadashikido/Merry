using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia;

public static class ConfiguracaoDbContext
{
    public static DbContextOptionsBuilder ConfigurarPostgreSql(this DbContextOptionsBuilder opcoes, string stringConexao)
    {
        return opcoes
            .UseNpgsql(stringConexao, npgsql => npgsql.MigrationsAssembly(typeof(CasamentoDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention();
    }
}
