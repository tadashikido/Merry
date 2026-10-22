using System.Text;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;

namespace Casamento.Dominio.DadosSensiveis;

public sealed class RestricaoAlimentar
{
    public const int TamanhoMaximoOutraRestricao = 80;
    public const int TamanhoMaximoNecessidadeEspecial = 200;
    public const int QuantidadeMaximaTipos = 6;

    private RestricaoAlimentar(IReadOnlyList<TipoRestricaoAlimentar> tipos, string? outraRestricao, string? necessidadeEspecial)
    {
        Tipos = tipos;
        OutraRestricao = outraRestricao;
        NecessidadeEspecial = necessidadeEspecial;
    }

    public IReadOnlyList<TipoRestricaoAlimentar> Tipos { get; }

    public string? OutraRestricao { get; }

    public string? NecessidadeEspecial { get; }

    public static RestricaoAlimentar? Criar(
        IReadOnlyCollection<TipoRestricaoAlimentar>? tipos,
        string? outraRestricao,
        string? necessidadeEspecial)
    {
        var informados = tipos ?? [];

        if (informados.Any(tipo => !Enum.IsDefined(tipo)))
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.TipoInvalido);
        }

        if (informados.Distinct().Count() != informados.Count)
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.TipoRepetido);
        }

        var outra = NormalizarTexto(outraRestricao);
        var necessidade = NormalizarTexto(necessidadeEspecial);

        if (outra is { Length: > TamanhoMaximoOutraRestricao })
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.TamanhoOutraRestricao);
        }

        if (necessidade is { Length: > TamanhoMaximoNecessidadeEspecial })
        {
            throw new RegraNegocioException(MensagensDadosSensiveis.TamanhoNecessidadeEspecial);
        }

        if (informados.Count == 0 && outra is null && necessidade is null)
        {
            return null;
        }

        return new RestricaoAlimentar(informados.OrderBy(tipo => tipo).ToList(), outra, necessidade);
    }

    public static string? NormalizarTexto(string? valor)
    {
        if (valor is null)
        {
            return null;
        }

        var semControle = new StringBuilder(valor.Length);

        foreach (var caractere in valor)
        {
            semControle.Append(char.IsControl(caractere) ? ' ' : caractere);
        }

        return NormalizadorTexto.Normalizar(semControle.ToString());
    }
}
