using Casamento.Aplicacao.Casamentos;
using Casamento.Dominio.Casamentos;

namespace Casamento.Testes.Unidade.Casamentos;

public class OrdenacaoCasamentosTestes
{
    private static readonly DateOnly Hoje = new(2027, 3, 10);
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private static CasamentoAssessorado Criar(string nome, int diasAPartirDeHoje, TimeOnly? horario = null)
    {
        return CasamentoAssessorado.Criar(
            CasamentoAssessoradoTestes.DadosValidos(nomePrimeiraPessoa: nome, data: Hoje.AddDays(diasAPartirDeHoje), horario: horario),
            Agora);
    }

    [Fact]
    public void OrdenarAtivos_DeveTrazerProximosAscendenteEDepoisRealizadosDescendente()
    {
        var casamentos = new[]
        {
            Criar("Cento e vinte", 120),
            Criar("Passado tres", -3),
            Criar("Trinta", 30),
            Criar("Hoje", 0),
            Criar("Passado dez", -10),
            Criar("Cinco", 5),
        };

        var ordenados = OrdenacaoCasamentos.OrdenarAtivos(casamentos, Hoje);

        Assert.Equal(
            ["Hoje", "Cinco", "Trinta", "Cento e vinte", "Passado tres", "Passado dez"],
            ordenados.Select(casamento => casamento.NomePrimeiraPessoa));
    }

    [Fact]
    public void OrdenarAtivos_MesmoDia_DevePriorizarHorarioEDeixarSemHorarioPorUltimo()
    {
        var casamentos = new[]
        {
            Criar("Sem horario", 10),
            Criar("Noite", 10, new TimeOnly(20, 0)),
            Criar("Tarde", 10, new TimeOnly(16, 30)),
        };

        var ordenados = OrdenacaoCasamentos.OrdenarAtivos(casamentos, Hoje);

        Assert.Equal(["Tarde", "Noite", "Sem horario"], ordenados.Select(casamento => casamento.NomePrimeiraPessoa));
    }

    [Fact]
    public void OrdenarAtivos_MesmoDiaESemHorario_DeveDesempatarPeloNome()
    {
        var casamentos = new[] { Criar("Carla", 10), Criar("ana", 10), Criar("Bia", 10) };

        var ordenados = OrdenacaoCasamentos.OrdenarAtivos(casamentos, Hoje);

        Assert.Equal(["ana", "Bia", "Carla"], ordenados.Select(casamento => casamento.NomePrimeiraPessoa));
    }

    [Fact]
    public void OrdenarAtivos_ListaVazia_DeveRetornarVazia()
    {
        Assert.Empty(OrdenacaoCasamentos.OrdenarAtivos([], Hoje));
    }

    [Fact]
    public void OrdenarArquivados_DeveTrazerArquivadosMaisRecentesPrimeiro()
    {
        var antigo = Criar("Antigo", 10);
        antigo.Arquivar(Agora.AddDays(-5));
        var recente = Criar("Recente", 20);
        recente.Arquivar(Agora.AddDays(-1));

        var ordenados = OrdenacaoCasamentos.OrdenarArquivados([antigo, recente]);

        Assert.Equal(["Recente", "Antigo"], ordenados.Select(casamento => casamento.NomePrimeiraPessoa));
    }
}
