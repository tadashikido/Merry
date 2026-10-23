using Celebri.Infraestrutura.Persistencia;
using Celebri.Testes.Integracao.Infraestrutura;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Celebri.Testes.Integracao.Isolamento;

public class FabricaApiIsolamento : FabricaApiAutenticacao
{
    private readonly string _stringConexao;
    private readonly bool _incluirEntidadeTeste;

    public FabricaApiIsolamento(string stringConexao, bool incluirEntidadeTeste)
        : base(stringConexao)
    {
        _stringConexao = stringConexao;
        _incluirEntidadeTeste = incluirEntidadeTeste;
    }

    public DbContextOptions<CelebriDbContext> CriarOpcoesDbContext()
    {
        var opcoes = new DbContextOptionsBuilder<CelebriDbContext>();
        ConfigurarOpcoes(opcoes);
        return opcoes.Options;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        if (!_incluirEntidadeTeste)
        {
            return;
        }

        builder.ConfigureTestServices(servicos =>
        {
            servicos.RemoveAll<DbContextOptions<CelebriDbContext>>();
            servicos.AddDbContext<CelebriDbContext>(ConfigurarOpcoes);
        });
    }

    private void ConfigurarOpcoes(DbContextOptionsBuilder opcoes)
    {
        opcoes.ConfigurarPostgreSql(_stringConexao);

        if (_incluirEntidadeTeste)
        {
            opcoes.ReplaceService<IModelCustomizer, CustomizadorModeloIsolamento>();
            opcoes.ConfigureWarnings(avisos => avisos.Ignore(RelationalEventId.PendingModelChangesWarning));
        }
    }
}
