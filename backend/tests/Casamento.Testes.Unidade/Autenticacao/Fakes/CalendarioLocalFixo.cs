using Casamento.Aplicacao.Calendario;

namespace Casamento.Testes.Unidade.Autenticacao.Fakes;

public class CalendarioLocalFixo : ICalendarioLocal
{
    public CalendarioLocalFixo(DateOnly hoje)
    {
        Data = hoje;
    }

    public DateOnly Data { get; set; }

    public TimeOnly Hora { get; set; } = new(12, 0);

    public DateOnly Hoje()
    {
        return Data;
    }

    public DateTime Agora()
    {
        return Data.ToDateTime(Hora);
    }
}
