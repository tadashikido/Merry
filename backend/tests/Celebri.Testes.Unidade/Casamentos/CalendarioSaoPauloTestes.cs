using Celebri.Infraestrutura.Calendario;
using Celebri.Testes.Unidade.Autenticacao.Fakes;

namespace Celebri.Testes.Unidade.Casamentos;

public class CalendarioSaoPauloTestes
{
    [Fact]
    public void Hoje_As23h30DeSaoPaulo_DeveRetornarODiaLocalEnquantoUtcJaVirou()
    {
        var relogio = new RelogioFixo(new DateTimeOffset(2027, 3, 11, 2, 30, 0, TimeSpan.Zero));

        var hoje = new CalendarioSaoPaulo(relogio).Hoje();

        Assert.Equal(new DateOnly(2027, 3, 10), hoje);
    }

    [Fact]
    public void Hoje_AMeiaNoiteDeSaoPaulo_DeveVirarODia()
    {
        var relogio = new RelogioFixo(new DateTimeOffset(2027, 3, 11, 3, 0, 0, TimeSpan.Zero));

        var hoje = new CalendarioSaoPaulo(relogio).Hoje();

        Assert.Equal(new DateOnly(2027, 3, 11), hoje);
    }

    [Fact]
    public void Hoje_DeveAcompanharORelogio()
    {
        var relogio = new RelogioFixo(new DateTimeOffset(2027, 12, 31, 12, 0, 0, TimeSpan.Zero));
        var calendario = new CalendarioSaoPaulo(relogio);

        relogio.Avancar(TimeSpan.FromHours(15));

        Assert.Equal(new DateOnly(2028, 1, 1), calendario.Hoje());
    }

    [Fact]
    public void Agora_DeveDevolverOHorarioDeParedeDeSaoPauloSemFuso()
    {
        var relogio = new RelogioFixo(new DateTimeOffset(2027, 3, 11, 2, 30, 15, TimeSpan.Zero));

        var agora = new CalendarioSaoPaulo(relogio).Agora();

        Assert.Equal(new DateTime(2027, 3, 10, 23, 30, 15), agora);
        Assert.Equal(DateTimeKind.Unspecified, agora.Kind);
    }

    [Fact]
    public void ObterFuso_DeveUsarDeslocamentoDeSaoPaulo()
    {
        var fuso = CalendarioSaoPaulo.ObterFuso();

        Assert.Equal(CalendarioSaoPaulo.DeslocamentoPadrao, fuso.GetUtcOffset(new DateTime(2027, 3, 10, 12, 0, 0, DateTimeKind.Utc)));
    }
}
