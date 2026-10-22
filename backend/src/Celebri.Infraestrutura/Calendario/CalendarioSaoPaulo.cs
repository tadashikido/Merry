using Celebri.Aplicacao.Calendario;

namespace Celebri.Infraestrutura.Calendario;

public class CalendarioSaoPaulo : ICalendarioLocal
{
    public const string IdentificadorFuso = "America/Sao_Paulo";

    public static readonly TimeSpan DeslocamentoPadrao = TimeSpan.FromHours(-3);

    private readonly TimeProvider _relogio;
    private readonly TimeZoneInfo _fuso;

    public CalendarioSaoPaulo(TimeProvider relogio)
    {
        _relogio = relogio;
        _fuso = ObterFuso();
    }

    public DateOnly Hoje()
    {
        return DateOnly.FromDateTime(Agora());
    }

    public DateTime Agora()
    {
        return DateTime.SpecifyKind(TimeZoneInfo.ConvertTime(_relogio.GetUtcNow(), _fuso).DateTime, DateTimeKind.Unspecified);
    }

    public static TimeZoneInfo ObterFuso()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(IdentificadorFuso);
        }
        catch (Exception excecao) when (excecao is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.CreateCustomTimeZone(IdentificadorFuso, DeslocamentoPadrao, IdentificadorFuso, IdentificadorFuso);
        }
    }
}
