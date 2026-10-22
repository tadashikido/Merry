using Celebri.Aplicacao.Autenticacao;
using Celebri.Infraestrutura.Seguranca;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.Autenticacao.Fakes;

public class CenarioAutenticacao
{
    public const string SenhaValida = "senhaForte123";
    public const string ChaveJwt = "chave-de-testes-unitarios-com-32-bytes-ou-mais";

    public CenarioAutenticacao()
    {
        Relogio = new RelogioFixo(new DateTimeOffset(2026, 9, 28, 12, 0, 0, TimeSpan.Zero));
        Opcoes = Options.Create(new OpcoesAutenticacao { UrlFrontend = "https://app.evento.teste/" });
        var opcoesJwt = Options.Create(new OpcoesJwt { ChaveAssinatura = ChaveJwt });

        Autenticacao = new AutenticacaoService(
            Banco,
            Banco,
            Banco,
            Banco,
            HashSenha,
            new GeradorTokenAcessoJwt(opcoesJwt, Opcoes, Relogio),
            GeradorTokenOpaco,
            Opcoes,
            Relogio);

        Recuperacao = new RecuperacaoSenhaService(
            Banco,
            Banco,
            Banco,
            Banco,
            HashSenha,
            GeradorTokenOpaco,
            Email,
            Opcoes,
            Relogio,
            NullLogger<RecuperacaoSenhaService>.Instance);
    }

    public BancoMemoria Banco { get; } = new();

    public RelogioFixo Relogio { get; }

    public IOptions<OpcoesAutenticacao> Opcoes { get; }

    public HashSenhaService HashSenha { get; } = new();

    public GeradorTokenOpaco GeradorTokenOpaco { get; } = new();

    public EnvioEmailFalso Email { get; } = new();

    public AutenticacaoService Autenticacao { get; }

    public RecuperacaoSenhaService Recuperacao { get; }

    public Task<ResultadoAutenticacao> CadastrarAsync(string email = "ana@exemplo.com", string senha = SenhaValida)
    {
        return Autenticacao.CadastrarAsync(new CadastroOrganizacaoRequest("Assessoria Ana", "Ana Souza", email, senha), CancellationToken.None);
    }

    public static string ExtrairToken(string link)
    {
        var indice = link.IndexOf("#token=", StringComparison.Ordinal);
        return Uri.UnescapeDataString(link[(indice + "#token=".Length)..].Split('\n')[0].Trim());
    }
}
