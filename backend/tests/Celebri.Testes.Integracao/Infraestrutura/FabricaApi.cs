using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Casamento.Testes.Integracao.Infraestrutura;

public class FabricaApi : WebApplicationFactory<Program>
{
    public const string OrigemPermitida = "https://app.casamento.teste";
    public const string ChaveJwtTeste = "chave-de-assinatura-exclusiva-dos-testes-de-integracao";
    public const string ChaveDadosSensiveisTeste = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=";
    public const string UrlFrontendTeste = "https://app.casamento.teste";
    public const string StringConexaoInalcancavel = "Host=127.0.0.1;Port=1;Database=inexistente;Username=teste;Password=teste;Timeout=2;Command Timeout=2";

    private readonly string _stringConexao;
    private readonly string _ambiente;
    private readonly IReadOnlyDictionary<string, string?> _configuracoesAdicionais;

    public FabricaApi(string stringConexao, string ambiente = "Testes", IReadOnlyDictionary<string, string?>? configuracoesAdicionais = null)
    {
        DiretorioArquivos = Path.Combine(Path.GetTempPath(), "nossia-testes-arquivos", Guid.NewGuid().ToString("N"));
        _stringConexao = stringConexao;
        _ambiente = ambiente;
        _configuracoesAdicionais = configuracoesAdicionais ?? new Dictionary<string, string?>();
    }

    public string DiretorioArquivos { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_ambiente);
        builder.UseSetting("ConnectionStrings:Principal", _stringConexao);
        builder.UseSetting("Cors:OrigensPermitidas:0", OrigemPermitida);
        builder.UseSetting("Banco:AplicarMigrationsAoIniciar", "false");
        builder.UseSetting("Jwt:ChaveAssinatura", ChaveJwtTeste);
        builder.UseSetting("Autenticacao:UrlFrontend", UrlFrontendTeste);
        builder.UseSetting("DadosSensiveis:ChaveCifragem", ChaveDadosSensiveisTeste);
        builder.UseSetting("RetencaoDadosSensiveis:Habilitada", "false");
        builder.UseSetting("Email:Smtp:Host", "localhost");
        builder.UseSetting("Email:Smtp:Porta", "1025");
        builder.UseSetting("Email:Smtp:UsarSsl", "false");
        builder.UseSetting("ArmazenamentoArquivos:Diretorio", DiretorioArquivos);

        foreach (var (chave, valor) in _configuracoesAdicionais)
        {
            builder.UseSetting(chave, valor);
        }

        builder.ConfigureTestServices(servicos =>
        {
            servicos.AddControllers().AddApplicationPart(typeof(FabricaApi).Assembly);
        });
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        LiberarPoolConexoes();
        ApagarDiretorioArquivos();
        GC.SuppressFinalize(this);
    }

    private void ApagarDiretorioArquivos()
    {
        if (Directory.Exists(DiretorioArquivos))
        {
            Directory.Delete(DiretorioArquivos, recursive: true);
        }
    }

    private void LiberarPoolConexoes()
    {
        if (_stringConexao == StringConexaoInalcancavel)
        {
            return;
        }

        using var conexao = new NpgsqlConnection(_stringConexao);
        NpgsqlConnection.ClearPool(conexao);
    }
}
