using System.Text;
using Celebri.Aplicacao.DadosSensiveis.Portas;
using Celebri.Aplicacao.Recifragem;
using Microsoft.Extensions.Options;

namespace Celebri.Infraestrutura.Seguranca;

public sealed class CifradorDadosSensiveis : ICifradorDadosSensiveis
{
    public const string PrefixoVersao = "v1.";
    public const string ContextoDadosAssociados = "casamento/dados-sensiveis/v1";

    private readonly byte[] _chave;
    private readonly byte[]? _chaveAnterior;

    public CifradorDadosSensiveis(IOptions<OpcoesDadosSensiveis> opcoes)
    {
        ArgumentNullException.ThrowIfNull(opcoes);
        _chave = opcoes.Value.ObterBytesChave();
        _chaveAnterior = opcoes.Value.ObterBytesChaveAnterior();
    }

    public string Cifrar(string texto, Guid convidadoId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(texto);

        return CifrarBytes(Encoding.UTF8.GetBytes(texto), convidadoId);
    }

    public string? Decifrar(string conteudoCifrado, Guid convidadoId)
    {
        var texto = DecifrarCom(_chave, conteudoCifrado, convidadoId)
            ?? (_chaveAnterior is null ? null : DecifrarCom(_chaveAnterior, conteudoCifrado, convidadoId));

        return texto is null ? null : Encoding.UTF8.GetString(texto);
    }

    public RecifragemCifra Recifrar(string conteudoCifrado, Guid convidadoId)
    {
        if (DecifrarCom(_chave, conteudoCifrado, convidadoId) is not null)
        {
            return RecifragemCifra.JaNaChaveAtual;
        }

        var texto = _chaveAnterior is null ? null : DecifrarCom(_chaveAnterior, conteudoCifrado, convidadoId);

        return texto is null ? RecifragemCifra.Ilegivel : RecifragemCifra.Recifrada(CifrarBytes(texto, convidadoId));
    }

    private string CifrarBytes(byte[] texto, Guid convidadoId)
    {
        return PrefixoVersao + CifraAesGcm.Cifrar(_chave, texto, DadosAssociados(convidadoId));
    }

    private static byte[]? DecifrarCom(byte[] chave, string conteudoCifrado, Guid convidadoId)
    {
        if (string.IsNullOrEmpty(conteudoCifrado) || !conteudoCifrado.StartsWith(PrefixoVersao, StringComparison.Ordinal))
        {
            return null;
        }

        return CifraAesGcm.Decifrar(chave, conteudoCifrado[PrefixoVersao.Length..], DadosAssociados(convidadoId));
    }

    private static byte[] DadosAssociados(Guid convidadoId)
    {
        return [.. Encoding.UTF8.GetBytes(ContextoDadosAssociados), .. convidadoId.ToByteArray()];
    }
}
