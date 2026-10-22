using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Eventos;

namespace Celebri.Testes.Unidade.Eventos;

public class OrdenacaoEventosTestes
{
    private static readonly DateOnly Hoje = new(2027, 3, 10);
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private static Evento Criar(string nome, int diasAPartirDeHoje, TimeOnly? horario = null)
    {
        return Evento.Criar(
            EventoTestes.DadosValidos(nomePrimeiraPessoa: nome, data: Hoje.AddDays(diasAPartirDeHoje), horario: horario),
            Agora);
    }

    [Fact]
    public void OrdenarAtivos_DeveTrazerProximosAscendenteEDepoisRealizadosDescendente()
    {
        var eventos = new[]
        {
            Criar("Cento e vinte", 120),
            Criar("Passado tres", -3),
            Criar("Trinta", 30),
            Criar("Hoje", 0),
            Criar("Passado dez", -10),
            Criar("Cinco", 5),
        };

        var ordenados = OrdenacaoEventos.OrdenarAtivos(eventos, Hoje);

        Assert.Equal(
            ["Hoje", "Cinco", "Trinta", "Cento e vinte", "Passado tres", "Passado dez"],
            ordenados.Select(evento => evento.NomePrimeiraPessoa));
    }

    [Fact]
    public void OrdenarAtivos_MesmoDia_DevePriorizarHorarioEDeixarSemHorarioPorUltimo()
    {
        var eventos = new[]
        {
            Criar("Sem horario", 10),
            Criar("Noite", 10, new TimeOnly(20, 0)),
            Criar("Tarde", 10, new TimeOnly(16, 30)),
        };

        var ordenados = OrdenacaoEventos.OrdenarAtivos(eventos, Hoje);

        Assert.Equal(["Tarde", "Noite", "Sem horario"], ordenados.Select(evento => evento.NomePrimeiraPessoa));
    }

    [Fact]
    public void OrdenarAtivos_MesmoDiaESemHorario_DeveDesempatarPeloNome()
    {
        var eventos = new[] { Criar("Carla", 10), Criar("ana", 10), Criar("Bia", 10) };

        var ordenados = OrdenacaoEventos.OrdenarAtivos(eventos, Hoje);

        Assert.Equal(["ana", "Bia", "Carla"], ordenados.Select(evento => evento.NomePrimeiraPessoa));
    }

    [Fact]
    public void OrdenarAtivos_ListaVazia_DeveRetornarVazia()
    {
        Assert.Empty(OrdenacaoEventos.OrdenarAtivos([], Hoje));
    }

    [Fact]
    public void OrdenarArquivados_DeveTrazerArquivadosMaisRecentesPrimeiro()
    {
        var antigo = Criar("Antigo", 10);
        antigo.Arquivar(Agora.AddDays(-5));
        var recente = Criar("Recente", 20);
        recente.Arquivar(Agora.AddDays(-1));

        var ordenados = OrdenacaoEventos.OrdenarArquivados([antigo, recente]);

        Assert.Equal(["Recente", "Antigo"], ordenados.Select(evento => evento.NomePrimeiraPessoa));
    }
}
