namespace Casamento.Aplicacao.DadosSensiveis;

public class OpcoesRetencaoDadosSensiveis
{
    public const string Secao = "RetencaoDadosSensiveis";
    public const int DiasMinimo = 1;
    public const int DiasMaximo = 365;
    public const int IntervaloMinutosMinimo = 1;
    public const int IntervaloMinutosMaximo = 1440;
    public const string MensagemConfiguracaoInvalida =
        "A retenção de dados sensíveis está configurada com valores inválidos. Use 'RetencaoDadosSensiveis__DiasAposCasamento' entre 1 e 365 e 'RetencaoDadosSensiveis__IntervaloMinutos' entre 1 e 1440.";

    public int DiasAposCasamento { get; set; } = 30;

    public int IntervaloMinutos { get; set; } = 360;

    public bool Habilitada { get; set; } = true;

    public bool Valida()
    {
        return DiasAposCasamento is >= DiasMinimo and <= DiasMaximo
            && IntervaloMinutos is >= IntervaloMinutosMinimo and <= IntervaloMinutosMaximo;
    }

    public DateOnly DataExclusao(DateOnly dataCasamento)
    {
        return dataCasamento.AddDays(DiasAposCasamento);
    }

    public bool RetencaoEncerrada(DateOnly dataCasamento, DateOnly hoje)
    {
        return hoje > DataExclusao(dataCasamento);
    }
}
