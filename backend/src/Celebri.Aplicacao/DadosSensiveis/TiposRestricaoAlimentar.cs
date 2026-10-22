using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Aplicacao.DadosSensiveis;

public static class TiposRestricaoAlimentar
{
    private static readonly HashSet<string> Nomes = [.. Enum.GetNames<TipoRestricaoAlimentar>()];

    public static bool TentarInterpretar(string? nome, out TipoRestricaoAlimentar tipo)
    {
        tipo = default;
        return nome is not null && Nomes.Contains(nome) && Enum.TryParse(nome, ignoreCase: false, out tipo);
    }
}
