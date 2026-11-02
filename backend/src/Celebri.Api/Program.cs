using Celebri.Api;
using Celebri.Aplicacao;
using Celebri.Aplicacao.Operadores;
using Celebri.Infraestrutura;
using Celebri.Infraestrutura.Persistencia;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(opcoes => opcoes.AddServerHeader = false);

builder.Services
    .AdicionarAplicacao()
    .AdicionarInfraestrutura(builder.Configuration)
    .AdicionarApi(builder.Configuration);

var app = builder.Build();

if (ComandosAdministrativos.EhComandoAdministrativo(args))
{
    Environment.ExitCode = await ComandosAdministrativos.ExecutarAsync(app.Services, app.Lifetime.ApplicationStopping);
    return;
}

if (app.Configuration.GetValue<bool>("Banco:AplicarMigrationsAoIniciar"))
{
    await AplicadorMigrations.AplicarMigrationsAsync(app.Services);

    using var escopoProvisionamento = app.Services.CreateScope();
    await escopoProvisionamento.ServiceProvider
        .GetRequiredService<IProvisionamentoOperadorService>()
        .ProvisionarInicialAsync(app.Lifetime.ApplicationStopping);
}

app.UsarPipelineApi();

await app.RunAsync();

public partial class Program
{
    protected Program()
    {
    }
}
