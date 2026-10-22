using System.Text;
using Celebri.Aplicacao.DadosSensiveis.Portas;
using Microsoft.Extensions.Options;

namespace Celebri.Infraestrutura.Seguranca;

public sealed class CifradorDadosSensiveis : ICifradorDadosSensiveis
{
    public const string PrefixoVersao = "v1.";
    public const string ContextoDadosAssociados = "casamento/dados-sensiveis/v1";

    private readonly byte[] _chave;

    public CifradorDadosSensiveis(IOptions<OpcoesDadosSensiveis> opcoes)
    {
        ArgumentNullException.ThrowIfNull(opcoes);
        _chave = opcoes.Value.ObterBytesChave();
    }

    public string Cifrar(string texto, Guid convidadoId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(texto);

        return PrefixoVersao + CifraAesGcm.Cifrar(_chave, Encoding.UTF8.GetBytes(texto), DadosAssociados(convidadoId));
    }

    public string? Decifrar(string conteudoCifrado, Guid convidadoId)
    {
        if (string.IsNullOrEmpty(conteudoCifrado) || !conteudoCifrado.StartsWith(PrefixoVersao, StringComparison.Ordinal))
        {
            return null;
        }

        var texto = CifraAesGcm.Decifrar(_chave, conteudoCifrado[PrefixoVersao.Length..], DadosAssociados(convidadoId));
        return texto is null ? null : Encoding.UTF8.GetString(texto);
    }

    private static byte[] DadosAssociados(Guid convidadoId)
    {
        return [.. Encoding.UTF8.GetBytes(ContextoDadosAssociados), .. convidadoId.ToByteArray()];
    }
}
