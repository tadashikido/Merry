using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Celebri.Infraestrutura.Persistencia;

public static class AplicadorMigrations
{
    public static async Task AplicarMigrationsAsync(IServiceProvider provedor, CancellationToken cancelamento = default)
    {
        await using var escopo = provedor.CreateAsyncScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CasamentoDbContext>();
        await contexto.Database.MigrateAsync(cancelamento);
    }
}
