using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Celebri.Infraestrutura.Persistencia;

public static class ConfiguracaoDbContext
{
    public static DbContextOptionsBuilder ConfigurarPostgreSql(this DbContextOptionsBuilder opcoes, string stringConexao)
    {
        return opcoes
            .UseNpgsql(MontarStringConexao(stringConexao), npgsql => npgsql.MigrationsAssembly(typeof(CelebriDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention();
    }

    public static string MontarStringConexao(string stringConexao)
    {
        var conexao = new NpgsqlConnectionStringBuilder(stringConexao)
        {
            GssEncryptionMode = GssEncryptionMode.Disable,
        };

        return conexao.ConnectionString;
    }
}
