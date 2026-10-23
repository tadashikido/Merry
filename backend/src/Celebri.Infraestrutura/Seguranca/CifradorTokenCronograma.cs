using System.Security.Cryptography;
using System.Text;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.Recifragem;
using Microsoft.Extensions.Options;

namespace Celebri.Infraestrutura.Seguranca;

public sealed class CifradorTokenCronograma : ICifradorTokenCronograma
{
    public const string ContextoDerivacao = "casamento/cronograma/token/v1";

    private readonly byte[] _chave;
    private readonly byte[]? _chaveAnterior;

    public CifradorTokenCronograma(IOptions<OpcoesDadosSensiveis> opcoes)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        _chave = Derivar(opcoes.Value.ObterBytesChave());
        var anterior = opcoes.Value.ObterBytesChaveAnterior();
        _chaveAnterior = anterior is null ? null : Derivar(anterior);
    }

    public string Cifrar(string token, Guid eventoId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        return CifraAesGcm.Cifrar(_chave, Encoding.UTF8.GetBytes(token), DadosAssociados(eventoId));
    }

    public string? Decifrar(string tokenCifrado, Guid eventoId)
    {
        var texto = CifraAesGcm.Decifrar(_chave, tokenCifrado, DadosAssociados(eventoId))
            ?? (_chaveAnterior is null ? null : CifraAesGcm.Decifrar(_chaveAnterior, tokenCifrado, DadosAssociados(eventoId)));

        return texto is null ? null : Encoding.UTF8.GetString(texto);
    }

    public RecifragemCifra Recifrar(string tokenCifrado, Guid eventoId)
    {
        if (CifraAesGcm.Decifrar(_chave, tokenCifrado, DadosAssociados(eventoId)) is not null)
        {
            return RecifragemCifra.JaNaChaveAtual;
        }

        var texto = _chaveAnterior is null ? null : CifraAesGcm.Decifrar(_chaveAnterior, tokenCifrado, DadosAssociados(eventoId));

        return texto is null
            ? RecifragemCifra.Ilegivel
            : RecifragemCifra.Recifrada(CifraAesGcm.Cifrar(_chave, texto, DadosAssociados(eventoId)));
    }

    private static byte[] Derivar(byte[] chaveMestra)
    {
        return HKDF.DeriveKey(
            HashAlgorithmName.SHA256,
            chaveMestra,
            CifraAesGcm.TamanhoChaveBytes,
            salt: [],
            info: Encoding.UTF8.GetBytes(ContextoDerivacao));
    }

    private static byte[] DadosAssociados(Guid eventoId)
    {
        return [.. Encoding.UTF8.GetBytes(ContextoDerivacao), .. eventoId.ToByteArray()];
    }
}
