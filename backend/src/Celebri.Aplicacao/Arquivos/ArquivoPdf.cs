using Celebri.Aplicacao.Excecoes;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Arquivos;

public static class ArquivoPdf
{
    public const long TamanhoMaximoBytes = 10 * 1024 * 1024;
    public const string TipoConteudo = "application/pdf";
    public const string Extensao = ".pdf";
    public const string NomePadrao = "contrato.pdf";

    private static readonly byte[] Assinatura = "%PDF-"u8.ToArray();

    public static bool PossuiAssinaturaPdf(ReadOnlySpan<byte> conteudo)
    {
        return conteudo.Length >= Assinatura.Length && conteudo[..Assinatura.Length].SequenceEqual(Assinatura);
    }

    public static string SanitizarNome(string? nomeOriginal)
    {
        return NomeArquivoSeguro.Sanitizar(nomeOriginal, Extensao, NomePadrao, FornecedorEvento.TamanhoMaximoNomeContrato);
    }

    public static Task<byte[]> LerComLimiteAsync(Stream conteudo, CancellationToken cancelamento)
    {
        return LerComLimiteAsync(conteudo, MensagensFornecedoresEvento.ContratoGrandeDemais, cancelamento);
    }

    public static async Task<byte[]> LerComLimiteAsync(Stream conteudo, string mensagemTamanho, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        using var memoria = new MemoryStream();
        var buffer = new byte[81920];
        long total = 0;
        int lidos;

        while ((lidos = await conteudo.ReadAsync(buffer, cancelamento)) > 0)
        {
            total += lidos;

            if (total > TamanhoMaximoBytes)
            {
                throw new ArquivoGrandeDemaisException(mensagemTamanho);
            }

            memoria.Write(buffer, 0, lidos);
        }

        return memoria.ToArray();
    }
}
