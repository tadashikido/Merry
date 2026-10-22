using Celebri.Dominio.Financeiro;

namespace Celebri.Aplicacao.Arquivos;

public static class ArquivoComprovante
{
    public const string TipoPdf = "application/pdf";
    public const string TipoJpeg = "image/jpeg";
    public const string TipoPng = "image/png";
    public const string NomePadraoBase = "comprovante";

    public static readonly IReadOnlyList<string> TiposPermitidos = [TipoPdf, TipoJpeg, TipoPng];

    private static readonly byte[] AssinaturaPdf = "%PDF-"u8.ToArray();
    private static readonly byte[] AssinaturaPng = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    private static readonly byte[] AssinaturaJpeg = [0xFF, 0xD8, 0xFF];

    public static FormatoComprovante? DetectarFormato(ReadOnlySpan<byte> conteudo)
    {
        if (ComecaCom(conteudo, AssinaturaPdf))
        {
            return new FormatoComprovante(TipoPdf, ".pdf");
        }

        if (ComecaCom(conteudo, AssinaturaPng))
        {
            return new FormatoComprovante(TipoPng, ".png");
        }

        if (ComecaCom(conteudo, AssinaturaJpeg))
        {
            return new FormatoComprovante(TipoJpeg, ".jpg");
        }

        return null;
    }

    public static string SanitizarNome(string? nomeOriginal, FormatoComprovante formato)
    {
        ArgumentNullException.ThrowIfNull(formato);

        return NomeArquivoSeguro.Sanitizar(
            nomeOriginal,
            formato.Extensao,
            NomePadraoBase + formato.Extensao,
            ParcelaFornecedor.TamanhoMaximoNomeComprovante);
    }

    public static Task<byte[]> LerComLimiteAsync(Stream conteudo, CancellationToken cancelamento)
    {
        return ArquivoPdf.LerComLimiteAsync(conteudo, MensagensFinanceiro.ComprovanteGrandeDemais, cancelamento);
    }

    private static bool ComecaCom(ReadOnlySpan<byte> conteudo, byte[] assinatura)
    {
        return conteudo.Length >= assinatura.Length && conteudo[..assinatura.Length].SequenceEqual(assinatura);
    }
}
