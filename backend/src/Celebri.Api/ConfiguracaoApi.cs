using System.Globalization;
using System.Net;
using System.Text.Json;
using Casamento.Api.Autenticacao;
using Casamento.Api.Middlewares;
using Casamento.Api.Tarefas;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Api.Tratamento;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RedeIp = Microsoft.AspNetCore.HttpOverrides.IPNetwork;

namespace Casamento.Api;

public static class ConfiguracaoApi
{
    public const string PoliticaCorsFrontend = "PoliticaFrontend";
    public const string RotaSaude = "/api/saude";

    public static IServiceCollection AdicionarApi(this IServiceCollection servicos, IConfiguration configuracao)
    {
        servicos.AddControllers();

        servicos.AddProblemDetails(opcoes =>
        {
            opcoes.CustomizeProblemDetails = contexto =>
            {
                contexto.ProblemDetails.Instance = null;
                contexto.ProblemDetails.Extensions.Remove("exception");
                contexto.ProblemDetails.Extensions["traceId"] = contexto.HttpContext.TraceIdentifier;
            };
        });
        servicos.AddExceptionHandler<ExcecaoGlobalHandler>();
        servicos.AdicionarAutenticacaoApi(configuracao);

        if (configuracao.GetValue($"{OpcoesRetencaoDadosSensiveis.Secao}:{nameof(OpcoesRetencaoDadosSensiveis.Habilitada)}", true))
        {
            servicos.AddHostedService<TarefaRetencaoDadosSensiveis>();
        }

        var origensPermitidas = ObterOrigensPermitidas(configuracao);
        servicos.AddCors(opcoes =>
        {
            opcoes.AddPolicy(PoliticaCorsFrontend, politica =>
            {
                politica
                    .WithOrigins(origensPermitidas)
                    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                    .WithHeaders("Content-Type", "Authorization", "Accept", ExigirCabecalhoRequisicaoAttribute.NomeCabecalho)
                    .WithExposedHeaders("Content-Disposition")
                    .AllowCredentials();
            });
        });

        servicos.Configure<ForwardedHeadersOptions>(opcoes => ConfigurarProxyReverso(opcoes, configuracao));

        servicos.AddHsts(opcoes =>
        {
            opcoes.MaxAge = TimeSpan.FromDays(365);
            opcoes.IncludeSubDomains = true;
        });

        return servicos;
    }

    public static WebApplication UsarPipelineApi(this WebApplication app)
    {
        app.UseForwardedHeaders();
        app.UseExceptionHandler();
        app.UseStatusCodePages();

        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        app.UseMiddleware<CabecalhosSegurancaMiddleware>();
        app.UseCors(PoliticaCorsFrontend);
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();

        app.MapControllers();
        app.MapHealthChecks(RotaSaude, new HealthCheckOptions
        {
            ResponseWriter = EscreverRespostaSaudeAsync,
        }).AllowAnonymous();

        return app;
    }

    public static string[] ObterOrigensPermitidas(IConfiguration configuracao)
    {
        var origens = configuracao.GetSection("Cors:OrigensPermitidas").Get<string[]>() ?? [];
        return origens
            .Where(origem => !string.IsNullOrWhiteSpace(origem) && origem.Trim() != "*")
            .Select(origem => origem.Trim().TrimEnd('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static void ConfigurarProxyReverso(ForwardedHeadersOptions opcoes, IConfiguration configuracao)
    {
        opcoes.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

        foreach (var proxy in LerLista(configuracao, "ProxyReverso:Proxies"))
        {
            if (!IPAddress.TryParse(proxy, out var endereco))
            {
                throw new InvalidOperationException($"Endereço de proxy inválido em 'ProxyReverso:Proxies': '{proxy}'.");
            }

            opcoes.KnownProxies.Add(endereco);
        }

        foreach (var rede in LerLista(configuracao, "ProxyReverso:Redes"))
        {
            opcoes.KnownNetworks.Add(InterpretarRede(rede));
        }
    }

    private static RedeIp InterpretarRede(string rede)
    {
        var partes = rede.Split('/');
        if (partes.Length == 2
            && IPAddress.TryParse(partes[0], out var prefixo)
            && int.TryParse(partes[1], NumberStyles.None, CultureInfo.InvariantCulture, out var tamanhoPrefixo)
            && tamanhoPrefixo <= (prefixo.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128))
        {
            return new RedeIp(prefixo, tamanhoPrefixo);
        }

        throw new InvalidOperationException($"Rede inválida em 'ProxyReverso:Redes': '{rede}'. Use o formato CIDR, por exemplo 10.0.0.0/8.");
    }

    private static IEnumerable<string> LerLista(IConfiguration configuracao, string chave)
    {
        return (configuracao.GetSection(chave).Get<string[]>() ?? [])
            .Where(valor => !string.IsNullOrWhiteSpace(valor))
            .Select(valor => valor.Trim());
    }

    private static Task EscreverRespostaSaudeAsync(HttpContext contexto, HealthReport relatorio)
    {
        contexto.Response.ContentType = "application/json; charset=utf-8";
        return contexto.Response.WriteAsync(JsonSerializer.Serialize(new { status = relatorio.Status.ToString() }));
    }
}
