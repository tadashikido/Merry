using Casamento.Api;
using Casamento.Aplicacao;
using Casamento.Infraestrutura;
using Casamento.Infraestrutura.Persistencia;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(opcoes => opcoes.AddServerHeader = false);

builder.Services
    .AdicionarAplicacao()
    .AdicionarInfraestrutura(builder.Configuration)
    .AdicionarApi(builder.Configuration);

var app = builder.Build();

if (app.Configuration.GetValue<bool>("Banco:AplicarMigrationsAoIniciar"))
{
    await AplicadorMigrations.AplicarMigrationsAsync(app.Services);
}

app.UsarPipelineApi();

await app.RunAsync();

public partial class Program
{
    protected Program()
    {
    }
}
