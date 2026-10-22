using Celebri.Dominio.Eventos;

namespace Celebri.Dominio.Cronogramas;

public static class ValidadeAcessoCronograma
{
    public const int DiasAposEvento = 7;

    public static DateOnly ValidoAte(DateOnly dataEvento)
    {
        return dataEvento.AddDays(DiasAposEvento);
    }

    public static bool Expirado(DateOnly dataEvento, DateOnly hoje)
    {
        return hoje > ValidoAte(dataEvento);
    }

    public static bool Ativo(Evento evento, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(evento);
        return !evento.Arquivado && !Expirado(evento.Data, hoje);
    }
}
