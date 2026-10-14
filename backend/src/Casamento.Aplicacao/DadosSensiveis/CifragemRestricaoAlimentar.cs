using System.Text.Json;
using Casamento.Aplicacao.DadosSensiveis.Portas;
using Casamento.Dominio.DadosSensiveis;
using Casamento.Dominio.Excecoes;

namespace Casamento.Aplicacao.DadosSensiveis;

public sealed class CifragemRestricaoAlimentar
{
    private readonly ICifradorDadosSensiveis _cifrador;

    public CifragemRestricaoAlimentar(ICifradorDadosSensiveis cifrador)
    {
        _cifrador = cifrador;
    }

    public static string Serializar(RestricaoAlimentar restricao)
    {
        ArgumentNullException.ThrowIfNull(restricao);

        return JsonSerializer.Serialize(new ConteudoRestricao(
            restricao.Tipos.Select(tipo => tipo.ToString()).ToList(),
            restricao.OutraRestricao,
            restricao.NecessidadeEspecial));
    }

    public static RestricaoAlimentar? Desserializar(string json)
    {
        try
        {
            var conteudo = JsonSerializer.Deserialize<ConteudoRestricao>(json);

            if (conteudo is null)
            {
                return null;
            }

            var tipos = new List<TipoRestricaoAlimentar>();

            foreach (var nome in conteudo.Tipos ?? [])
            {
                if (!TiposRestricaoAlimentar.TentarInterpretar(nome, out var tipo))
                {
                    return null;
                }

                tipos.Add(tipo);
            }

            return RestricaoAlimentar.Criar(tipos, conteudo.Outra, conteudo.Necessidade);
        }
        catch (JsonException)
        {
            return null;
        }
        catch (RegraNegocioException)
        {
            return null;
        }
    }

    public string Cifrar(RestricaoAlimentar restricao, Guid convidadoId)
    {
        return _cifrador.Cifrar(Serializar(restricao), convidadoId);
    }

    public RestricaoAlimentar? Ler(string conteudoCifrado, Guid convidadoId)
    {
        var json = _cifrador.Decifrar(conteudoCifrado, convidadoId);
        return json is null ? null : Desserializar(json);
    }

    private sealed record ConteudoRestricao(IReadOnlyList<string>? Tipos, string? Outra, string? Necessidade);
}
