using System.Text;
using Casamento.Aplicacao.Convidados.Importacao;

namespace Casamento.Testes.Unidade.Convidados.Importacao;

public static class PlanilhasTeste
{
    public static byte[] Fixture(string nome)
    {
        return File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Convidados", "Importacao", "Fixtures", nome));
    }

    public static byte[] Utf8(string conteudo)
    {
        return Encoding.UTF8.GetBytes(conteudo);
    }

    public static PlanilhaLida Planilha(params string[] linhas)
    {
        return LeitorCsv.Ler(Utf8(string.Join("\n", linhas)));
    }

    public static string Linhas(int quantidade, string cabecalho = "Nome;Telefone", Func<int, string>? linha = null)
    {
        var construtor = new StringBuilder(cabecalho).Append('\n');
        for (var indice = 1; indice <= quantidade; indice++)
        {
            construtor.Append(linha is null ? $"Pessoa {indice:D4};11{900000000 + indice}" : linha(indice)).Append('\n');
        }

        return construtor.ToString();
    }
}
