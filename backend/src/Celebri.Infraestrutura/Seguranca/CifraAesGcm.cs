using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace Casamento.Infraestrutura.Seguranca;

public static class CifraAesGcm
{
    public const int TamanhoChaveBytes = 32;

    private static readonly int TamanhoNonce = AesGcm.NonceByteSizes.MaxSize;
    private static readonly int TamanhoEtiqueta = AesGcm.TagByteSizes.MaxSize;

    public static string Cifrar(byte[] chave, byte[] texto, byte[] dadosAssociados)
    {
        ArgumentNullException.ThrowIfNull(chave);
        ArgumentNullException.ThrowIfNull(texto);

        var nonce = RandomNumberGenerator.GetBytes(TamanhoNonce);
        var cifra = new byte[texto.Length];
        var etiqueta = new byte[TamanhoEtiqueta];

        using var aes = new AesGcm(chave, TamanhoEtiqueta);
        aes.Encrypt(nonce, texto, cifra, etiqueta, dadosAssociados);

        return WebEncoders.Base64UrlEncode([.. nonce, .. cifra, .. etiqueta]);
    }

    public static byte[]? Decifrar(byte[] chave, string conteudo, byte[] dadosAssociados)
    {
        ArgumentNullException.ThrowIfNull(chave);

        byte[] dados;

        try
        {
            dados = WebEncoders.Base64UrlDecode(conteudo);
        }
        catch (FormatException)
        {
            return null;
        }

        if (dados.Length <= TamanhoNonce + TamanhoEtiqueta)
        {
            return null;
        }

        var nonce = dados.AsSpan(0, TamanhoNonce);
        var cifra = dados.AsSpan(TamanhoNonce, dados.Length - TamanhoNonce - TamanhoEtiqueta);
        var etiqueta = dados.AsSpan(dados.Length - TamanhoEtiqueta);
        var texto = new byte[cifra.Length];

        try
        {
            using var aes = new AesGcm(chave, TamanhoEtiqueta);
            aes.Decrypt(nonce, cifra, etiqueta, texto, dadosAssociados);
        }
        catch (AuthenticationTagMismatchException)
        {
            return null;
        }

        return texto;
    }
}
