using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Checklists;

namespace Celebri.Testes.Unidade.Eventos;

public class CalculadoraProximosPassosTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Validade = TimeSpan.FromDays(7);

    [Fact]
    public void EventoSemDados_DeveTerTodosOsPassosPendentes()
    {
        var passos = CalculadoraProximosPassos.Calcular([], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);

        Assert.False(passos.AnfitriaoConvidado);
        Assert.False(passos.ChecklistAplicado);
        Assert.False(passos.ConvidadosCadastrados);
        Assert.False(passos.ConvitesEnviados);
        Assert.False(passos.TodosConcluidos);
    }

    [Theory]
    [InlineData(SituacaoAcessoAnfitriao.Pendente, true)]
    [InlineData(SituacaoAcessoAnfitriao.Ativo, true)]
    [InlineData(SituacaoAcessoAnfitriao.Expirado, false)]
    [InlineData(SituacaoAcessoAnfitriao.Revogado, false)]
    public void AnfitriaoConvidado_DeveConsiderarApenasAcessosPendentesOuAtivos(SituacaoAcessoAnfitriao situacao, bool esperado)
    {
        var passos = CalculadoraProximosPassos.Calcular([situacao], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);

        Assert.Equal(esperado, passos.AnfitriaoConvidado);
    }

    [Fact]
    public void AnfitriaoConvidado_ComUmAcessoExpiradoEOutroAtivo_DeveSerConcluido()
    {
        var passos = CalculadoraProximosPassos.Calcular(
            [SituacaoAcessoAnfitriao.Expirado, SituacaoAcessoAnfitriao.Ativo],
            ProgressoChecklist.Vazio,
            ResumoEnvioConvites.Vazio);

        Assert.True(passos.AnfitriaoConvidado);
    }

    [Fact]
    public void ConviteDoAnfitriaoVencido_NaoDeveContarComoAnfitriaoConvidado()
    {
        var acesso = AcessoAnfitriao.Convidar(Guid.NewGuid(), "Lívia Moraes", "livia@exemplo.com", Guid.NewGuid(), Agora, Validade);

        var noPrazo = CalculadoraProximosPassos.Calcular([acesso.Situacao(Agora.AddDays(1))], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);
        var vencido = CalculadoraProximosPassos.Calcular([acesso.Situacao(Agora.AddDays(8))], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);

        Assert.True(noPrazo.AnfitriaoConvidado);
        Assert.False(vencido.AnfitriaoConvidado);
    }

    [Theory]
    [InlineData(0, 0, 0, false)]
    [InlineData(1, 0, 0, true)]
    [InlineData(3, 0, 3, true)]
    [InlineData(5, 5, 0, true)]
    public void ChecklistAplicado_DeveDependerDeTarefasOriginadasDeModelo(int total, int concluidas, int canceladas, bool esperado)
    {
        var passos = CalculadoraProximosPassos.Calcular([], new ProgressoChecklist(total, concluidas, canceladas), ResumoEnvioConvites.Vazio);

        Assert.Equal(esperado, passos.ChecklistAplicado);
    }

    [Fact]
    public void ConvitesCadastradosSemEnvio_DeveConcluirApenasConvidados()
    {
        var passos = CalculadoraProximosPassos.Calcular([], ProgressoChecklist.Vazio, new ResumoEnvioConvites(true, false));

        Assert.True(passos.ConvidadosCadastrados);
        Assert.False(passos.ConvitesEnviados);
    }

    [Fact]
    public void CenarioDoCriterio_TresPrimeirosConcluidosEEnvioPendente()
    {
        var passos = CalculadoraProximosPassos.Calcular(
            [SituacaoAcessoAnfitriao.Pendente],
            new ProgressoChecklist(12, 0, 0),
            new ResumoEnvioConvites(true, false));

        Assert.True(passos.AnfitriaoConvidado);
        Assert.True(passos.ChecklistAplicado);
        Assert.True(passos.ConvidadosCadastrados);
        Assert.False(passos.ConvitesEnviados);
        Assert.False(passos.TodosConcluidos);
    }

    [Fact]
    public void TodosOsPassosConcluidos_DeveMarcarTodosConcluidos()
    {
        var passos = CalculadoraProximosPassos.Calcular(
            [SituacaoAcessoAnfitriao.Ativo],
            new ProgressoChecklist(4, 1, 0),
            new ResumoEnvioConvites(true, true));

        Assert.True(passos.TodosConcluidos);
    }

    [Fact]
    public void ArgumentosNulos_DevemSerRejeitados()
    {
        Assert.Throws<ArgumentNullException>(() => CalculadoraProximosPassos.Calcular(null!, ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio));
        Assert.Throws<ArgumentNullException>(() => CalculadoraProximosPassos.Calcular([], null!, ResumoEnvioConvites.Vazio));
        Assert.Throws<ArgumentNullException>(() => CalculadoraProximosPassos.Calcular([], ProgressoChecklist.Vazio, null!));
    }
}
