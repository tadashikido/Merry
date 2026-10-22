namespace Celebri.Infraestrutura.Arquivos;

public class OpcoesArmazenamentoArquivos
{
    public const string Secao = "ArmazenamentoArquivos";
    public const string MensagemDiretorioInvalido =
        "O diretório de arquivos não foi configurado ou não é um caminho absoluto. Defina 'ArmazenamentoArquivos__Diretorio' com um caminho absoluto fora da aplicação, por exemplo /var/lib/celebri/arquivos.";

    public string Diretorio { get; set; } = string.Empty;

    public static bool DiretorioValido(string? diretorio)
    {
        return !string.IsNullOrWhiteSpace(diretorio) && Path.IsPathFullyQualified(diretorio);
    }
}
