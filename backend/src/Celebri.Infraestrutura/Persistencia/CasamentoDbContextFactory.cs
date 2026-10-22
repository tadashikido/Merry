using Celebri.Infraestrutura.Persistencia.Isolamento;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Celebri.Infraestrutura.Persistencia;

public class CasamentoDbContextFactory : IDesignTimeDbContextFactory<CasamentoDbContext>
{
    private const string StringConexaoDesign = "Host=localhost;Database=casamento";

    public CasamentoDbContext CreateDbContext(string[] args)
    {
        var opcoes = new DbContextOptionsBuilder<CasamentoDbContext>();
        opcoes.ConfigurarPostgreSql(StringConexaoDesign);
        return new CasamentoDbContext(opcoes.Options, new ContextoIsolamentoSemOrganizacao());
    }
}
