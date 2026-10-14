using System.Security.Cryptography;
using System.Text;
using Casamento.Aplicacao.Rsvp.Portas;
using Microsoft.Extensions.Options;

namespace Casamento.Infraestrutura.Seguranca;

public sealed class CifradorTokenRsvp : ICifradorTokenRsvp
{
    public const string ContextoDerivacao = "casamento/rsvp/token/v1";
    public const int TamanhoChaveBytes = CifraAesGcm.TamanhoChaveBytes;

    private readonly byte[] _chave;

    public CifradorTokenRsvp(IOptions<OpcoesJwt> opcoesJwt)
    {
        ArgumentNullException.ThrowIfNull(opcoesJwt);

        _chave = HKDF.DeriveKey(
            HashAlgorithmName.SHA256,
            opcoesJwt.Value.ObterBytesChave(),
            TamanhoChaveBytes,
            salt: [],
            info: Encoding.UTF8.GetBytes(ContextoDerivacao));
    }

    public string Cifrar(string token, Guid conviteId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        return CifraAesGcm.Cifrar(_chave, Encoding.UTF8.GetBytes(token), conviteId.ToByteArray());
    }

    public string? Decifrar(string tokenCifrado, Guid conviteId)
    {
        var texto = CifraAesGcm.Decifrar(_chave, tokenCifrado, conviteId.ToByteArray());
        return texto is null ? null : Encoding.UTF8.GetString(texto);
    }
}
