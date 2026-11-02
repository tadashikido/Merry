using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Operadores;
using Celebri.Dominio.Operadores;
using Celebri.Infraestrutura.Seguranca;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.Operadores;

public class CenarioOperador
{
    public const string SenhaValida = "senhaForte123";
    public const string ChaveJwt = "chave-de-testes-unitarios-com-32-bytes-ou-mais";

    public CenarioOperador()
    {
        Relogio = new RelogioFixo(new DateTimeOffset(2026, 9, 28, 12, 0, 0, TimeSpan.Zero));
        Opcoes = Options.Create(new OpcoesAutenticacao { UrlFrontend = "https://app.evento.teste/" });
        var opcoesJwt = Options.Create(new OpcoesJwt { ChaveAssinatura = ChaveJwt });

        Autenticacao = new OperadorAutenticacaoService(
            Banco,
            Banco,
            Banco,
            HashSenha,
            new GeradorTokenOperadorJwt(opcoesJwt, Opcoes, Relogio),
            GeradorTokenOpaco,
            Opcoes,
            Relogio);
    }

    public BancoMemoriaOperador Banco { get; } = new();

    public RelogioFixo Relogio { get; }

    public IOptions<OpcoesAutenticacao> Opcoes { get; }

    public HashSenhaService HashSenha { get; } = new();

    public GeradorTokenOpaco GeradorTokenOpaco { get; } = new();

    public OperadorAutenticacaoService Autenticacao { get; }

    public OperadorPlataforma CriarOperador(string email = "op@exemplo.com", string senha = SenhaValida)
    {
        var operador = OperadorPlataforma.Criar("Operador Teste", email, HashSenha.GerarHash(senha), Relogio.GetUtcNow());
        Banco.Adicionar(operador);
        return operador;
    }
}
