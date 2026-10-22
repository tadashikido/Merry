using Celebri.Infraestrutura.Persistencia.Isolamento;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Celebri.Infraestrutura.Persistencia;

public class CelebriDbContextFactory : IDesignTimeDbContextFactory<CelebriDbContext>
{
    private const string StringConexaoDesign = "Host=localhost;Database=evento";

    public CelebriDbContext CreateDbContext(string[] args)
    {
        var opcoes = new DbContextOptionsBuilder<CelebriDbContext>();
        opcoes.ConfigurarPostgreSql(StringConexaoDesign);
        return new CelebriDbContext(opcoes.Options, new ContextoIsolamentoSemOrganizacao());
    }
}
