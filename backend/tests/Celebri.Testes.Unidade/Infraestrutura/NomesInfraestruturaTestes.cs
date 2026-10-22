using System.Text.RegularExpressions;
using Celebri.Api;

namespace Celebri.Testes.Unidade.Infraestrutura;

public partial class NomesInfraestruturaTestes
{
    private const string DiretorioArquivos = "/var/lib/celebri/arquivos";

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

    [GeneratedRegex(@"^ENTRYPOINT \[""dotnet"", ""(?<dll>[^""]+)""\]$", RegexOptions.Multiline)]
    private static partial Regex EntryPoint();

    [GeneratedRegex(@"dockerfile: (?<caminho>\S+)")]
    private static partial Regex CaminhoDockerfile();

    [Fact]
    public void Dockerfile_DeveIniciarOAssemblyDaApiCelebri()
    {
        var nomeAssembly = typeof(ConfiguracaoApi).Assembly.GetName().Name;

        var entryPoint = EntryPoint().Match(Ler("backend/src/Celebri.Api/Dockerfile"));

        Assert.Equal("Celebri.Api", nomeAssembly);
        Assert.True(entryPoint.Success);
        Assert.Equal($"{nomeAssembly}.dll", entryPoint.Groups["dll"].Value);
    }

    [Fact]
    public void Dockerfile_DeveCriarODiretorioDeArquivosRestritoAoUsuarioDaAplicacao()
    {
        var dockerfile = Ler("backend/src/Celebri.Api/Dockerfile");

        Assert.Contains($"mkdir -p {DiretorioArquivos} && chown $APP_UID {DiretorioArquivos} && chmod 700 {DiretorioArquivos}", dockerfile);
        Assert.Contains("COPY Directory.Build.props Directory.Packages.props Celebri.sln ./", dockerfile);
    }

    [Theory]
    [InlineData("docker-compose.yml")]
    [InlineData("docker-compose.prod.yml")]
    public void Compose_DeveApontarParaODockerfileExistenteEMontarOVolumeNoDiretorioConfigurado(string arquivoCompose)
    {
        var compose = Ler(arquivoCompose);
        var dockerfileApi = CaminhoDockerfile().Matches(compose)
            .Select(correspondencia => correspondencia.Groups["caminho"].Value)
            .Single(caminho => caminho.Contains("Api", StringComparison.Ordinal));

        Assert.Equal("src/Celebri.Api/Dockerfile", dockerfileApi);
        Assert.True(File.Exists(Path.Combine(RaizRepositorio(), "backend", dockerfileApi)));
        Assert.Contains($"ArmazenamentoArquivos__Diretorio: {DiretorioArquivos}", compose);
        Assert.Contains($"- arquivos-enlace:{DiretorioArquivos}", compose);
    }

    [Fact]
    public void ComposeDeProducao_DevePreservarOsNomesFisicosQueAncoramOsDados()
    {
        var compose = Ler("docker-compose.prod.yml");

        Assert.StartsWith("name: casamento-producao\n", compose);
        Assert.Contains("- dados-postgres:/var/lib/postgresql/data", compose);
        Assert.Contains("volumes:\n  dados-postgres:\n  arquivos-enlace:\n", compose);
        Assert.Contains("- subnet: 10.214.0.0/24", compose);
    }

    [Fact]
    public void ComposeDeDesenvolvimento_DevePreservarONomeDoProjetoEOsVolumes()
    {
        var compose = Ler("docker-compose.yml");

        Assert.StartsWith("name: casamento\n", compose);
        Assert.Contains("volumes:\n  dados-postgres:\n  arquivos-enlace:\n", compose);
    }

    [Theory]
    [InlineData("docker-compose.yml")]
    [InlineData("docker-compose.prod.yml")]
    [InlineData("deploy.sh")]
    [InlineData("backend/src/Celebri.Api/Dockerfile")]
    [InlineData(".github/workflows/ci.yml")]
    [InlineData(".github/workflows/deploy.yml")]
    public void ArquivosDeInfraestrutura_NaoDevemCitarNomesAntigos(string arquivo)
    {
        var conteudo = Ler(arquivo);

        Assert.DoesNotMatch("(?i)nossia", conteudo);
        Assert.DoesNotMatch(@"Casamento\.(sln|Api|Aplicacao|Dominio|Infraestrutura|Testes)", conteudo);
        Assert.DoesNotContain("casamento.conf.template", conteudo, StringComparison.Ordinal);
    }

    [Fact]
    public void WorkflowDeDeploy_DeveLocalizarODiretorioDaVpsPeloScriptVersionado()
    {
        var workflow = Ler(".github/workflows/deploy.yml");

        Assert.Contains("sparse-checkout: infra/deploy", workflow);
        Assert.Contains("< infra/deploy/localizar-deploy.sh", workflow);
        Assert.True(File.Exists(Path.Combine(RaizRepositorio(), "infra", "deploy", "localizar-deploy.sh")));
        Assert.True(File.Exists(Path.Combine(RaizRepositorio(), "infra", "nginx", "celebri.conf.template")));
    }
}
