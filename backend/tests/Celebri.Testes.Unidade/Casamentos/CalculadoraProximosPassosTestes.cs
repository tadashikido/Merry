using Celebri.Aplicacao.Casamentos;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosCasal;
using Celebri.Dominio.Checklists;

namespace Celebri.Testes.Unidade.Casamentos;

public class CalculadoraProximosPassosTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Validade = TimeSpan.FromDays(7);

    [Fact]
    public void CasamentoSemDados_DeveTerTodosOsPassosPendentes()
    {
        var passos = CalculadoraProximosPassos.Calcular([], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);

        Assert.False(passos.CasalConvidado);
        Assert.False(passos.ChecklistAplicado);
        Assert.False(passos.ConvidadosCadastrados);
        Assert.False(passos.ConvitesEnviados);
        Assert.False(passos.TodosConcluidos);
    }

    [Theory]
    [InlineData(SituacaoAcessoCasal.Pendente, true)]
    [InlineData(SituacaoAcessoCasal.Ativo, true)]
    [InlineData(SituacaoAcessoCasal.Expirado, false)]
    [InlineData(SituacaoAcessoCasal.Revogado, false)]
    public void CasalConvidado_DeveConsiderarApenasAcessosPendentesOuAtivos(SituacaoAcessoCasal situacao, bool esperado)
    {
        var passos = CalculadoraProximosPassos.Calcular([situacao], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);

        Assert.Equal(esperado, passos.CasalConvidado);
    }

    [Fact]
    public void CasalConvidado_ComUmAcessoExpiradoEOutroAtivo_DeveSerConcluido()
    {
        var passos = CalculadoraProximosPassos.Calcular(
            [SituacaoAcessoCasal.Expirado, SituacaoAcessoCasal.Ativo],
            ProgressoChecklist.Vazio,
            ResumoEnvioConvites.Vazio);

        Assert.True(passos.CasalConvidado);
    }

    [Fact]
    public void ConviteDoCasalVencido_NaoDeveContarComoCasalConvidado()
    {
        var acesso = AcessoCasal.Convidar(Guid.NewGuid(), "Lívia Moraes", "livia@exemplo.com", Guid.NewGuid(), Agora, Validade);

        var noPrazo = CalculadoraProximosPassos.Calcular([acesso.Situacao(Agora.AddDays(1))], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);
        var vencido = CalculadoraProximosPassos.Calcular([acesso.Situacao(Agora.AddDays(8))], ProgressoChecklist.Vazio, ResumoEnvioConvites.Vazio);

        Assert.True(noPrazo.CasalConvidado);
        Assert.False(vencido.CasalConvidado);
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
            [SituacaoAcessoCasal.Pendente],
            new ProgressoChecklist(12, 0, 0),
            new ResumoEnvioConvites(true, false));

        Assert.True(passos.CasalConvidado);
        Assert.True(passos.ChecklistAplicado);
        Assert.True(passos.ConvidadosCadastrados);
        Assert.False(passos.ConvitesEnviados);
        Assert.False(passos.TodosConcluidos);
    }

    [Fact]
    public void TodosOsPassosConcluidos_DeveMarcarTodosConcluidos()
    {
        var passos = CalculadoraProximosPassos.Calcular(
            [SituacaoAcessoCasal.Ativo],
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
