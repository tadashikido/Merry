using System.Net;
using Casamento.Api;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;

namespace Casamento.Testes.Unidade.Api;

public class ConfiguracaoApiTestes
{
    [Fact]
    public void ObterOrigensPermitidas_SemConfiguracao_DeveRetornarListaVazia()
    {
        var configuracao = new ConfigurationBuilder().Build();

        var origens = ConfiguracaoApi.ObterOrigensPermitidas(configuracao);

        Assert.Empty(origens);
    }

    [Fact]
    public void ObterOrigensPermitidas_DeveDescartarCuringaEValoresVazios()
    {
        var configuracao = CriarConfiguracao("*", " ", "https://app.casamento.com.br", " * ");

        var origens = ConfiguracaoApi.ObterOrigensPermitidas(configuracao);

        Assert.Equal(["https://app.casamento.com.br"], origens);
    }

    [Fact]
    public void ObterOrigensPermitidas_DeveNormalizarBarraFinalEEliminarDuplicadas()
    {
        var configuracao = CriarConfiguracao("https://app.casamento.com.br/", "HTTPS://APP.CASAMENTO.COM.BR", "http://localhost:5173");

        var origens = ConfiguracaoApi.ObterOrigensPermitidas(configuracao);

        Assert.Equal(2, origens.Length);
        Assert.Contains("https://app.casamento.com.br", origens);
        Assert.Contains("http://localhost:5173", origens);
    }

    [Fact]
    public void ConfigurarProxyReverso_SemConfiguracao_DeveConfiarApenasEmLoopback()
    {
        var opcoes = new ForwardedHeadersOptions();

        ConfiguracaoApi.ConfigurarProxyReverso(opcoes, new ConfigurationBuilder().Build());

        Assert.Equal(ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto, opcoes.ForwardedHeaders);
        Assert.All(opcoes.KnownProxies, proxy => Assert.True(IPAddress.IsLoopback(proxy)));
        Assert.All(opcoes.KnownNetworks, rede => Assert.True(IPAddress.IsLoopback(rede.Prefix)));
    }

    [Fact]
    public void ConfigurarProxyReverso_DeveAdicionarProxiesERedesConfigurados()
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ProxyReverso:Proxies:0"] = "10.0.0.5",
                ["ProxyReverso:Redes:0"] = "172.16.0.0/12",
                ["ProxyReverso:Redes:1"] = "fd00::/8",
            })
            .Build();
        var opcoes = new ForwardedHeadersOptions();

        ConfiguracaoApi.ConfigurarProxyReverso(opcoes, configuracao);

        Assert.Contains(IPAddress.Parse("10.0.0.5"), opcoes.KnownProxies);
        Assert.Contains(opcoes.KnownNetworks, rede => rede.Prefix.Equals(IPAddress.Parse("172.16.0.0")) && rede.PrefixLength == 12);
        Assert.Contains(opcoes.KnownNetworks, rede => rede.Prefix.Equals(IPAddress.Parse("fd00::")) && rede.PrefixLength == 8);
    }

    [Theory]
    [InlineData("ProxyReverso:Proxies:0", "nao-e-ip")]
    [InlineData("ProxyReverso:Redes:0", "10.0.0.0")]
    [InlineData("ProxyReverso:Redes:0", "10.0.0.0/33")]
    [InlineData("ProxyReverso:Redes:0", "10.0.0.0/-1")]
    [InlineData("ProxyReverso:Redes:0", "rede/8")]
    public void ConfigurarProxyReverso_ValorInvalido_DeveFalharNaInicializacao(string chave, string valor)
    {
        var configuracao = new ConfigurationBuilder()
            .AddInMemoryCollection([new KeyValuePair<string, string?>(chave, valor)])
            .Build();

        var excecao = Assert.Throws<InvalidOperationException>(() => ConfiguracaoApi.ConfigurarProxyReverso(new ForwardedHeadersOptions(), configuracao));

        Assert.Contains(valor, excecao.Message);
    }

    private static IConfiguration CriarConfiguracao(params string[] origens)
    {
        var valores = origens
            .Select((origem, indice) => new KeyValuePair<string, string?>($"Cors:OrigensPermitidas:{indice}", origem));
        return new ConfigurationBuilder().AddInMemoryCollection(valores).Build();
    }
}
