using Celebri.Dominio.Casamentos;

namespace Celebri.Dominio.Cronogramas;

public static class ValidadeAcessoCronograma
{
    public const int DiasAposCasamento = 7;

    public static DateOnly ValidoAte(DateOnly dataCasamento)
    {
        return dataCasamento.AddDays(DiasAposCasamento);
    }

    public static bool Expirado(DateOnly dataCasamento, DateOnly hoje)
    {
        return hoje > ValidoAte(dataCasamento);
    }

    public static bool Ativo(CasamentoAssessorado casamento, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(casamento);
        return !casamento.Arquivado && !Expirado(casamento.Data, hoje);
    }
}
