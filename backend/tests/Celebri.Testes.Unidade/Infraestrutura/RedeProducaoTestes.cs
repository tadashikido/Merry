using System.Net;
using System.Text.RegularExpressions;

namespace Celebri.Testes.Unidade.Infraestrutura;

public partial class RedeProducaoTestes
{
    private const string FaixaDeProducao = "10.214.0.0/24";

    private static readonly string[] FaixasPrivadas = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];

    public static TheoryData<string> PoolsPadraoDoDocker()
    {
        var pools = new TheoryData<string>();

        for (var segundoOcteto = 17; segundoOcteto <= 31; segundoOcteto++)
        {
            pools.Add($"172.{segundoOcteto}.0.0/16");
        }

        pools.Add("192.168.0.0/16");
        return pools;
    }

    [GeneratedRegex(@"^\s*- subnet:\s*(?<faixa>\S+)\s*$", RegexOptions.Multiline)]
    private static partial Regex SubnetDoCompose();

    [GeneratedRegex(@"^\s*ProxyReverso__Redes__0:\s*(?<faixa>\S+)\s*$", RegexOptions.Multiline)]
    private static partial Regex RedeConfiavelDaApi();

    [GeneratedRegex(@"geo \$realip_remote_addr \$proxy_borda_confiavel \{[^}]*?^\s*(?<faixa>[\d./]+)\s+1;", RegexOptions.Multiline)]
    private static partial Regex GeoDoNginx();

    [GeneratedRegex(@"^\s*set_real_ip_from\s+(?<faixa>[\d./]+);", RegexOptions.Multiline)]
    private static partial Regex RealIpDoNginx();

    [GeneratedRegex(@"docker network create --subnet (?<faixa>\S+) ""\$REDE_INTERNA""")]
    private static partial Regex RedeInternaDoTesteDeProxy();

    private static string RaizRepositorio()
    {
        var diretorio = new DirectoryInfo(AppContext.BaseDirectory);

        while (diretorio is not null && !File.Exists(Path.Combine(diretorio.FullName, "docker-compose.prod.yml")))
        {
            diretorio = diretorio.Parent;
        }

        return diretorio?.FullName ?? throw new DirectoryNotFoundException("Raiz do repositório não encontrada.");
    }

    private static string Ler(string caminhoRelativo) =>
        File.ReadAllText(Path.Combine(RaizRepositorio(), caminhoRelativo)).ReplaceLineEndings("\n");

    private static string Extrair(Regex padrao, string arquivo)
    {
        var correspondencias = padrao.Matches(Ler(arquivo));

        Assert.True(correspondencias.Count == 1, $"Esperada exatamente uma declaração de faixa em {arquivo} para o padrão {padrao}; encontradas {correspondencias.Count}.");
        return correspondencias[0].Groups["faixa"].Value;
    }

    private static Dictionary<string, string> FaixasDeclaradas() => new()
    {
        ["docker-compose.prod.yml (subnet)"] = Extrair(SubnetDoCompose(), "docker-compose.prod.yml"),
        ["docker-compose.prod.yml (ProxyReverso__Redes__0)"] = Extrair(RedeConfiavelDaApi(), "docker-compose.prod.yml"),
        ["frontend/nginx/default.conf (geo)"] = Extrair(GeoDoNginx(), "frontend/nginx/default.conf"),
        ["frontend/nginx/default.conf (set_real_ip_from)"] = Extrair(RealIpDoNginx(), "frontend/nginx/default.conf"),
        ["infra/testes/proxy.test.sh (rede interna)"] = Extrair(RedeInternaDoTesteDeProxy(), "infra/testes/proxy.test.sh"),
    };

    private static bool Sobrepoe(string faixa, string outraFaixa)
    {
        var rede = IPNetwork.Parse(faixa);
        var outraRede = IPNetwork.Parse(outraFaixa);

        return rede.Contains(outraRede.BaseAddress) || outraRede.Contains(rede.BaseAddress);
    }

    private static bool Contem(string faixa, string outraFaixa)
    {
        var rede = IPNetwork.Parse(faixa);
        var outraRede = IPNetwork.Parse(outraFaixa);

        return rede.PrefixLength <= outraRede.PrefixLength && rede.Contains(outraRede.BaseAddress);
    }

    [Fact]
    public void PontosDaRedeDeProducao_DevemDeclararAMesmaFaixa()
    {
        var divergentes = FaixasDeclaradas()
            .Where(ponto => ponto.Value != FaixaDeProducao)
            .Select(ponto => $"{ponto.Key} = {ponto.Value}")
            .ToList();

        Assert.True(divergentes.Count == 0, $"Faixa da rede de produção divergente de {FaixaDeProducao}: {string.Join("; ", divergentes)}.");
    }

    [Fact]
    public void FaixaDeProducao_DeveSerPrivada()
    {
        foreach (var (ponto, faixa) in FaixasDeclaradas())
        {
            Assert.True(FaixasPrivadas.Any(privada => Contem(privada, faixa)), $"{ponto} declara {faixa}, fora das faixas privadas RFC 1918.");
        }
    }

    [Theory]
    [MemberData(nameof(PoolsPadraoDoDocker))]
    public void FaixaDeProducao_NaoDeveSobreporPoolPadraoDoDocker(string pool)
    {
        foreach (var (ponto, faixa) in FaixasDeclaradas())
        {
            Assert.False(Sobrepoe(faixa, pool), $"{ponto} declara {faixa}, que se sobrepõe ao pool padrão do Docker {pool}.");
        }
    }

    [Theory]
    [InlineData("172.30.0.0/24", "172.30.0.0/16", true)]
    [InlineData("172.30.0.0/16", "172.30.0.0/24", true)]
    [InlineData("10.0.0.0/8", "10.214.0.0/24", true)]
    [InlineData("10.214.0.0/24", "172.30.0.0/16", false)]
    [InlineData("10.214.0.0/24", "10.214.1.0/24", false)]
    [InlineData("192.168.250.0/24", "192.168.0.0/16", true)]
    public void Sobrepoe_DeveDetectarColisaoEntreFaixas(string faixa, string outraFaixa, bool esperado)
    {
        Assert.Equal(esperado, Sobrepoe(faixa, outraFaixa));
    }

    [Theory]
    [InlineData("10.0.0.0/8", "10.214.0.0/24", true)]
    [InlineData("10.214.0.0/24", "10.0.0.0/8", false)]
    [InlineData("172.16.0.0/12", "172.32.0.0/24", false)]
    [InlineData("192.168.0.0/16", "203.0.113.0/24", false)]
    public void Contem_DeveExigirQueAFaixaInteiraEstejaDentro(string faixa, string outraFaixa, bool esperado)
    {
        Assert.Equal(esperado, Contem(faixa, outraFaixa));
    }
}
