namespace Casamento.Dominio.DadosSensiveis;

public sealed class AlteracaoDadosSensiveis
{
    private AlteracaoDadosSensiveis(TipoAlteracaoDadosSensiveis tipo, RestricaoAlimentar? restricao)
    {
        Tipo = tipo;
        Restricao = restricao;
    }

    public static AlteracaoDadosSensiveis Manter { get; } = new(TipoAlteracaoDadosSensiveis.Manter, null);

    public static AlteracaoDadosSensiveis Remover { get; } = new(TipoAlteracaoDadosSensiveis.Remover, null);

    public TipoAlteracaoDadosSensiveis Tipo { get; }

    public RestricaoAlimentar? Restricao { get; }

    public static AlteracaoDadosSensiveis Informar(RestricaoAlimentar restricao)
    {
        ArgumentNullException.ThrowIfNull(restricao);
        return new AlteracaoDadosSensiveis(TipoAlteracaoDadosSensiveis.Informar, restricao);
    }

    public static AlteracaoDadosSensiveis Para(RestricaoAlimentar? restricao)
    {
        return restricao is null ? Remover : Informar(restricao);
    }
}
