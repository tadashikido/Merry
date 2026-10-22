using System.Security.Cryptography;
using System.Text;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Microsoft.Extensions.Options;

namespace Celebri.Infraestrutura.Seguranca;

public sealed class CifradorTokenCronograma : ICifradorTokenCronograma
{
    public const string ContextoDerivacao = "casamento/cronograma/token/v1";

    private readonly byte[] _chave;

    public CifradorTokenCronograma(IOptions<OpcoesDadosSensiveis> opcoes)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        _chave = HKDF.DeriveKey(
            HashAlgorithmName.SHA256,
            opcoes.Value.ObterBytesChave(),
            CifraAesGcm.TamanhoChaveBytes,
            salt: [],
            info: Encoding.UTF8.GetBytes(ContextoDerivacao));
    }

    public string Cifrar(string token, Guid casamentoId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        return CifraAesGcm.Cifrar(_chave, Encoding.UTF8.GetBytes(token), DadosAssociados(casamentoId));
    }

    public string? Decifrar(string tokenCifrado, Guid casamentoId)
    {
        var texto = CifraAesGcm.Decifrar(_chave, tokenCifrado, DadosAssociados(casamentoId));
        return texto is null ? null : Encoding.UTF8.GetString(texto);
    }

    private static byte[] DadosAssociados(Guid casamentoId)
    {
        return [.. Encoding.UTF8.GetBytes(ContextoDerivacao), .. casamentoId.ToByteArray()];
    }
}
