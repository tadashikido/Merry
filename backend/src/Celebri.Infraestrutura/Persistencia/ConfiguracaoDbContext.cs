using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia;

public static class ConfiguracaoDbContext
{
    public static DbContextOptionsBuilder ConfigurarPostgreSql(this DbContextOptionsBuilder opcoes, string stringConexao)
    {
        return opcoes
            .UseNpgsql(stringConexao, npgsql => npgsql.MigrationsAssembly(typeof(CelebriDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention();
    }
}
