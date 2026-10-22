using Casamento.Infraestrutura.Persistencia;
using Casamento.Testes.Integracao.Infraestrutura;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Casamento.Testes.Integracao.Isolamento;

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

    public DbContextOptions<CasamentoDbContext> CriarOpcoesDbContext()
    {
        var opcoes = new DbContextOptionsBuilder<CasamentoDbContext>();
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
            servicos.RemoveAll<DbContextOptions<CasamentoDbContext>>();
            servicos.AddDbContext<CasamentoDbContext>(ConfigurarOpcoes);
        });
    }

    private void ConfigurarOpcoes(DbContextOptionsBuilder opcoes)
    {
        opcoes.ConfigurarPostgreSql(_stringConexao);

        if (_incluirEntidadeTeste)
        {
            opcoes.ReplaceService<IModelCustomizer, CustomizadorModeloIsolamento>();
        }
    }
}
