using System.Globalization;
using System.Threading.RateLimiting;
using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Infraestrutura.Seguranca;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Casamento.Api.Autenticacao;

public static class ConfiguracaoAutenticacaoApi
{
    public static readonly TimeSpan ToleranciaRelogio = TimeSpan.FromSeconds(30);

    public static IServiceCollection AdicionarAutenticacaoApi(this IServiceCollection servicos, IConfiguration configuracao)
    {
        servicos.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        servicos.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<OpcoesJwt>>((opcoes, opcoesJwt) => ConfigurarJwtBearer(opcoes, opcoesJwt.Value));

        servicos.AddAuthorization(opcoes =>
        {
            opcoes.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAssertion(contexto => UsuarioAutenticadoOuRotaInexistente(contexto))
                .Build();
            PoliticasAutorizacao.Registrar(opcoes);
        });

        servicos.AddHttpContextAccessor();
        servicos.AddScoped<IUsuarioAtual, UsuarioAtualHttp>();

        servicos.AddRateLimiter(opcoes =>
        {
            foreach (var (politica, padrao) in PoliticasLimiteRequisicao.Padroes)
            {
                var secao = configuracao.GetSection($"{PoliticasLimiteRequisicao.SecaoConfiguracao}:{politica}");
                var limite = secao.GetValue("Limite", padrao.Limite);
                var janela = TimeSpan.FromSeconds(secao.GetValue("JanelaSegundos", padrao.JanelaSegundos));

                var porUsuario = PoliticasLimiteRequisicao.PorUsuario.Contains(politica);

                opcoes.AddPolicy(politica, contexto => RateLimitPartition.GetFixedWindowLimiter(
                    ChaveParticao(contexto, porUsuario),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = limite,
                        Window = janela,
                        QueueLimit = 0,
                        AutoReplenishment = true,
                    }));
            }

            opcoes.OnRejected = EscreverLimiteExcedidoAsync;
        });

        return servicos;
    }

    public static void ConfigurarJwtBearer(JwtBearerOptions opcoes, OpcoesJwt opcoesJwt)
    {
        opcoes.MapInboundClaims = false;
        opcoes.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = opcoesJwt.Emissor,
            ValidateAudience = true,
            ValidAudience = opcoesJwt.Audiencia,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(opcoesJwt.ObterBytesChave()),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = ToleranciaRelogio,
            NameClaimType = ClaimsAutenticacao.Nome,
            RoleClaimType = ClaimsAutenticacao.Papel,
        };
        opcoes.Events = new JwtBearerEvents
        {
            OnTokenValidated = ValidadorSessaoCasal.ValidarAsync,
        };
    }

    public static string ChaveParticao(HttpContext contexto, bool porUsuario)
    {
        ArgumentNullException.ThrowIfNull(contexto);

        var usuario = porUsuario ? contexto.User.FindFirst(ClaimsAutenticacao.UsuarioId)?.Value : null;

        return string.IsNullOrEmpty(usuario)
            ? $"ip:{contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido"}"
            : $"usuario:{usuario}";
    }

    public static bool UsuarioAutenticadoOuRotaInexistente(AuthorizationHandlerContext contexto)
    {
        if (contexto.User.Identity?.IsAuthenticated == true)
        {
            return true;
        }

        return contexto.Resource is HttpContext contextoHttp && contextoHttp.GetEndpoint() is null;
    }

    private static async ValueTask EscreverLimiteExcedidoAsync(OnRejectedContext contexto, CancellationToken cancelamento)
    {
        var resposta = contexto.HttpContext.Response;
        resposta.StatusCode = StatusCodes.Status429TooManyRequests;

        if (contexto.Lease.TryGetMetadata(MetadataName.RetryAfter, out var tempoEspera))
        {
            resposta.Headers.RetryAfter = ((int)Math.Ceiling(tempoEspera.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        }

        var servicoProblemas = contexto.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
        await servicoProblemas.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = contexto.HttpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = PoliticasLimiteRequisicao.TituloLimiteExcedido,
            },
        });
    }
}
