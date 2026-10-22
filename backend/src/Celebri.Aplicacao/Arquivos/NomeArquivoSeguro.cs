using System.Text;

namespace Casamento.Aplicacao.Arquivos;

public static class NomeArquivoSeguro
{
    private static readonly char[] CaracteresProibidos = ['"', '\'', '\\', '/', ':', '*', '?', '<', '>', '|', ';', '%'];

    public static string Sanitizar(string? nomeOriginal, string extensao, string nomePadrao, int tamanhoMaximo)
    {
        if (string.IsNullOrWhiteSpace(nomeOriginal))
        {
            return nomePadrao;
        }

        var semDiretorio = nomeOriginal.Replace('\\', '/');
        var indiceBarra = semDiretorio.LastIndexOf('/');
        var nome = indiceBarra >= 0 ? semDiretorio[(indiceBarra + 1)..] : semDiretorio;

        var construtor = new StringBuilder(nome.Length);

        foreach (var caractere in nome.Normalize(NormalizationForm.FormC))
        {
            if (char.IsControl(caractere) || Array.IndexOf(CaracteresProibidos, caractere) >= 0)
            {
                construtor.Append('_');
                continue;
            }

            construtor.Append(caractere);
        }

        var saneado = string.Join(' ', construtor.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries)).Trim('.', ' ');
        var semExtensao = RemoverExtensao(saneado, extensao);

        if (semExtensao.Length == 0)
        {
            return nomePadrao;
        }

        var tamanhoMaximoBase = tamanhoMaximo - extensao.Length;

        if (semExtensao.Length > tamanhoMaximoBase)
        {
            semExtensao = semExtensao[..tamanhoMaximoBase].TrimEnd('.', ' ');
        }

        return semExtensao + extensao;
    }

    private static string RemoverExtensao(string nome, string extensao)
    {
        foreach (var candidata in ExtensoesEquivalentes(extensao))
        {
            if (nome.EndsWith(candidata, StringComparison.OrdinalIgnoreCase))
            {
                return nome[..^candidata.Length].TrimEnd('.', ' ');
            }
        }

        return nome;
    }

    private static IEnumerable<string> ExtensoesEquivalentes(string extensao)
    {
        return extensao.Equals(".jpg", StringComparison.OrdinalIgnoreCase) ? [".jpeg", ".jpg"] : [extensao];
    }
}
