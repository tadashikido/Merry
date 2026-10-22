using Celebri.Aplicacao.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Celebri.Testes.Integracao.Infraestrutura;

public class FabricaApiAutenticacao : FabricaApi
{
    public FabricaApiAutenticacao(string stringConexao, IReadOnlyDictionary<string, string?>? configuracoesAdicionais = null)
        : base(stringConexao, configuracoesAdicionais: MesclarConfiguracoes(configuracoesAdicionais))
    {
    }

    public EnvioEmailMemoria Email { get; } = new();

    public HttpClient CriarClienteHttps()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = false,
            AllowAutoRedirect = false,
        });
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureTestServices(servicos =>
        {
            servicos.RemoveAll<IEnvioEmailService>();
            servicos.AddSingleton<IEnvioEmailService>(Email);
        });
    }

    private static Dictionary<string, string?> MesclarConfiguracoes(IReadOnlyDictionary<string, string?>? adicionais)
    {
        var configuracoes = new Dictionary<string, string?>
        {
            ["Banco:AplicarMigrationsAoIniciar"] = "true",
            ["LimitesRequisicao:entrar:Limite"] = "1000",
            ["LimitesRequisicao:cadastro:Limite"] = "1000",
            ["LimitesRequisicao:recuperacao:Limite"] = "1000",
            ["LimitesRequisicao:renovar:Limite"] = "1000",
            ["LimitesRequisicao:importacao:Limite"] = "1000",
            ["LimitesRequisicao:rsvp:Limite"] = "1000",
            ["LimitesRequisicao:acesso-casal:Limite"] = "1000",
            ["LimitesRequisicao:comprovante:Limite"] = "1000",
        };

        foreach (var (chave, valor) in adicionais ?? new Dictionary<string, string?>())
        {
            configuracoes[chave] = valor;
        }

        return configuracoes;
    }
}
