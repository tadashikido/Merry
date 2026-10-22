using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;

namespace Celebri.Testes.Unidade.Casamentos;

public class PlanoDuplicacaoCasamentoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2026, 9, 30);
    private static readonly DateOnly DataOrigem = new(2027, 5, 15);
    private static readonly DateOnly NovaData = new(2028, 5, 13);
    private static readonly Guid CasamentoOrigem = Guid.NewGuid();
    private static readonly Guid CasamentoDestino = Guid.NewGuid();

    private static TarefaCasamento Tarefa(
        string titulo = "Contratar fotógrafo",
        DateOnly? prazo = null,
        Guid? origemModeloItemId = null,
        ResponsavelTarefa responsavel = ResponsavelTarefa.Assessoria,
        DateTimeOffset? criadaEm = null)
    {
        return TarefaCasamento.Criar(
            CasamentoOrigem,
            new DadosTarefa(titulo, "Pedir três orçamentos", responsavel, CategoriaTarefa.Fornecedores, prazo),
            Guid.NewGuid(),
            criadaEm ?? Agora.AddDays(-100),
            origemModeloItemId);
    }

    private static VinculoParaDuplicar Vinculo(
        StatusFornecedorCasamento status = StatusFornecedorCasamento.Cotacao,
        bool fornecedorArquivado = false,
        decimal? contratado = null)
    {
        var vinculo = FornecedorCasamento.Criar(
            CasamentoOrigem,
            Guid.NewGuid(),
            new DadosFornecedorCasamento("Jantar para 200", 18_000m, contratado, status, "Comissão combinada"),
            Guid.NewGuid(),
            Agora.AddDays(-50));
        return new VinculoParaDuplicar(vinculo, fornecedorArquivado);
    }

    private static PlanoDuplicacaoCasamento Montar(
        IEnumerable<TarefaParaDuplicar>? tarefas = null,
        IEnumerable<VinculoParaDuplicar>? vinculos = null,
        DateOnly? novaData = null,
        bool semData = false)
    {
        return PlanoDuplicacaoCasamento.Montar(
            DataOrigem,
            semData ? null : novaData ?? NovaData,
            Hoje,
            tarefas ?? [],
            vinculos ?? []);
    }

    [Fact]
    public void CalcularPrazo_TarefaDoChecklistComItem_DeveUsarDiasDoItemNaNovaData()
    {
        var item = new TarefaParaDuplicar(Tarefa(prazo: DataOrigem.AddDays(-200), origemModeloItemId: Guid.NewGuid()), 180);

        var prazo = PlanoDuplicacaoCasamento.CalcularPrazo(item, DataOrigem, NovaData);

        Assert.Equal(ItemModeloChecklist.CalcularPrazo(NovaData, 180), prazo);
        Assert.Equal(new DateOnly(2027, 11, 15), prazo);
    }

    [Fact]
    public void CalcularPrazo_TarefaManual_DeveDeslocarPelaDiferencaEntreAsDatas()
    {
        var item = new TarefaParaDuplicar(Tarefa(prazo: DataOrigem.AddDays(-30)), null);

        Assert.Equal(NovaData.AddDays(-30), PlanoDuplicacaoCasamento.CalcularPrazo(item, DataOrigem, NovaData));
    }

    [Fact]
    public void CalcularPrazo_PrazoDepoisDoCasamento_DeveManterADistancia()
    {
        var item = new TarefaParaDuplicar(Tarefa(prazo: DataOrigem.AddDays(15)), null);

        Assert.Equal(NovaData.AddDays(15), PlanoDuplicacaoCasamento.CalcularPrazo(item, DataOrigem, NovaData));
    }

    [Fact]
    public void CalcularPrazo_TarefaComOrigemSemItem_DeveDeslocarComoManual()
    {
        var item = new TarefaParaDuplicar(Tarefa(prazo: DataOrigem.AddDays(-10), origemModeloItemId: Guid.NewGuid()), null);

        Assert.Equal(NovaData.AddDays(-10), PlanoDuplicacaoCasamento.CalcularPrazo(item, DataOrigem, NovaData));
    }

    [Fact]
    public void CalcularPrazo_SemPrazo_DeveContinuarSemPrazo()
    {
        var item = new TarefaParaDuplicar(Tarefa(prazo: null), null);

        Assert.Null(PlanoDuplicacaoCasamento.CalcularPrazo(item, DataOrigem, NovaData));
    }

    [Fact]
    public void CalcularPrazo_ForaDaFaixa_DeveLimitarA2000E2100()
    {
        var depois = new TarefaParaDuplicar(Tarefa(prazo: new DateOnly(2100, 12, 1)), null);
        var antes = new TarefaParaDuplicar(Tarefa(prazo: new DateOnly(2000, 1, 10)), null);

        Assert.Equal(TarefaCasamento.PrazoMaximo, PlanoDuplicacaoCasamento.CalcularPrazo(depois, DataOrigem, new DateOnly(2100, 12, 31)));
        Assert.Equal(TarefaCasamento.PrazoMinimo, PlanoDuplicacaoCasamento.CalcularPrazo(antes, DataOrigem, new DateOnly(2000, 1, 1)));
    }

    [Fact]
    public void Montar_DeveIgnorarCanceladasEContarAsDoChecklist()
    {
        var cancelada = Tarefa("Descartada");
        cancelada.AlterarStatus(StatusTarefa.Cancelada, ResponsavelTarefa.Assessoria, Guid.NewGuid(), Agora);
        var tarefas = new[]
        {
            new TarefaParaDuplicar(Tarefa("Item do modelo", DataOrigem.AddDays(-30), Guid.NewGuid()), 30),
            new TarefaParaDuplicar(Tarefa("Manual", DataOrigem.AddDays(-5)), null),
            new TarefaParaDuplicar(cancelada, null),
        };

        var plano = Montar(tarefas);

        Assert.Equal(2, plano.Tarefas.Count);
        Assert.Equal(1, plano.TarefasDoChecklist);
        Assert.Equal(1, plano.TarefasCanceladasIgnoradas);
        Assert.DoesNotContain(plano.Tarefas, item => item.Tarefa.Titulo == "Descartada");
    }

    [Fact]
    public void Montar_DeveContarTarefasQueNascemAtrasadas()
    {
        var tarefas = new[]
        {
            new TarefaParaDuplicar(Tarefa("Muito antes", DataOrigem.AddDays(-400)), null),
            new TarefaParaDuplicar(Tarefa("Item de um ano", DataOrigem.AddDays(-365), Guid.NewGuid()), 365),
            new TarefaParaDuplicar(Tarefa("Perto", DataOrigem.AddDays(-5)), null),
            new TarefaParaDuplicar(Tarefa("Sem prazo"), null),
        };

        var plano = Montar(tarefas, novaData: new DateOnly(2027, 1, 1));

        Assert.Equal(2, plano.NascemAtrasadas);
    }

    [Fact]
    public void Montar_SemNovaData_NaoDeveContarAtrasadasENemGerarTarefas()
    {
        var plano = Montar([new TarefaParaDuplicar(Tarefa("Muito antes", DataOrigem.AddDays(-5000)), null)], semData: true);

        Assert.Equal(0, plano.NascemAtrasadas);
        Assert.Throws<InvalidOperationException>(() => plano.GerarTarefas(CasamentoDestino, Guid.NewGuid(), Agora));
    }

    [Fact]
    public void GerarTarefas_DeveCopiarComoAFazerSemConclusaoPreservandoOrigemDoChecklist()
    {
        var itemId = Guid.NewGuid();
        var doModelo = Tarefa("Item do modelo", DataOrigem.AddDays(-180), itemId, ResponsavelTarefa.Casal);
        doModelo.AlterarStatus(StatusTarefa.Concluida, ResponsavelTarefa.Casal, Guid.NewGuid(), Agora);
        var manual = Tarefa("Manual", DataOrigem.AddDays(-20));
        manual.AlterarStatus(StatusTarefa.EmAndamento, ResponsavelTarefa.Assessoria, Guid.NewGuid(), Agora);
        var usuario = Guid.NewGuid();
        var plano = Montar([new TarefaParaDuplicar(doModelo, 180), new TarefaParaDuplicar(manual, null)]);

        var geradas = plano.GerarTarefas(CasamentoDestino, usuario, Agora);

        Assert.Equal(2, geradas.Count);
        Assert.All(geradas, tarefa =>
        {
            Assert.NotEqual(Guid.Empty, tarefa.Id);
            Assert.Equal(CasamentoDestino, tarefa.CasamentoId);
            Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
            Assert.Null(tarefa.ConcluidaEm);
            Assert.Null(tarefa.ConcluidaPor);
            Assert.Null(tarefa.ConcluidaPorUsuarioId);
            Assert.Equal(usuario, tarefa.CriadoPorUsuarioId);
            Assert.Equal(Agora, tarefa.CriadoEm);
            Assert.Equal(Guid.Empty, tarefa.OrganizacaoId);
        });
        var copiaModelo = geradas.Single(tarefa => tarefa.Titulo == "Item do modelo");
        Assert.Equal(itemId, copiaModelo.OrigemModeloItemId);
        Assert.Equal(ResponsavelTarefa.Casal, copiaModelo.Responsavel);
        Assert.Equal(CategoriaTarefa.Fornecedores, copiaModelo.Categoria);
        Assert.Equal("Pedir três orçamentos", copiaModelo.Descricao);
        Assert.Equal(NovaData.AddDays(-180), copiaModelo.Prazo);
        var copiaManual = geradas.Single(tarefa => tarefa.Titulo == "Manual");
        Assert.Null(copiaManual.OrigemModeloItemId);
        Assert.Equal(NovaData.AddDays(-20), copiaManual.Prazo);
        Assert.NotEqual(doModelo.Id, copiaModelo.Id);
        Assert.Equal(StatusTarefa.Concluida, doModelo.Status);
    }

    [Fact]
    public void GerarTarefas_OrigemSemItem_NaoDevePreservarOrigem()
    {
        var plano = Montar([new TarefaParaDuplicar(Tarefa("Órfã", DataOrigem.AddDays(-3), Guid.NewGuid()), null)]);

        var gerada = Assert.Single(plano.GerarTarefas(CasamentoDestino, null, Agora));

        Assert.Null(gerada.OrigemModeloItemId);
        Assert.Equal(0, plano.TarefasDoChecklist);
    }

    [Fact]
    public void Montar_DeveRespeitarLimiteDeTarefasPorCasamento()
    {
        var tarefas = Enumerable.Range(0, TarefaCasamento.LimitePorCasamento + 3)
            .Select(indice => new TarefaParaDuplicar(Tarefa($"Tarefa {indice:000}", criadaEm: Agora.AddMinutes(indice)), null));

        var plano = Montar(tarefas);

        Assert.Equal(TarefaCasamento.LimitePorCasamento, plano.Tarefas.Count);
        Assert.Equal("Tarefa 000", plano.Tarefas[0].Tarefa.Titulo);
    }

    [Fact]
    public void Montar_DeveIgnorarVinculosCanceladosEComFornecedorArquivado()
    {
        var vinculos = new[]
        {
            Vinculo(StatusFornecedorCasamento.Contratado, contratado: 18_500m),
            Vinculo(StatusFornecedorCasamento.EmNegociacao),
            Vinculo(StatusFornecedorCasamento.Cancelado),
            Vinculo(fornecedorArquivado: true),
        };

        var plano = Montar(vinculos: vinculos);

        Assert.Equal(2, plano.Vinculos.Count);
        Assert.Equal(2, plano.FornecedoresIgnorados);
    }

    [Fact]
    public void GerarVinculos_DeveCopiarSoServicoEOrcadoEmCotacao()
    {
        var contratado = Vinculo(StatusFornecedorCasamento.Contratado, contratado: 18_500m);
        contratado.Vinculo.AnexarContrato(Guid.NewGuid(), "contrato.pdf", 1024, Agora);
        var usuario = Guid.NewGuid();
        var plano = Montar(vinculos: [contratado]);

        var copia = Assert.Single(plano.GerarVinculos(CasamentoDestino, usuario, Agora));

        Assert.Equal(CasamentoDestino, copia.CasamentoId);
        Assert.Equal(contratado.Vinculo.FornecedorId, copia.FornecedorId);
        Assert.Equal(StatusFornecedorCasamento.Cotacao, copia.Status);
        Assert.Equal("Jantar para 200", copia.Servico);
        Assert.Equal(18_000m, copia.ValorOrcado);
        Assert.Null(copia.ValorContratado);
        Assert.Null(copia.NotasInternas);
        Assert.Null(copia.ContratoArquivoId);
        Assert.False(copia.PossuiContrato);
        Assert.Equal(usuario, copia.CriadoPorUsuarioId);
        Assert.NotEqual(contratado.Vinculo.Id, copia.Id);
    }

    [Fact]
    public void ElegivelParaCopia_DeveRecusarCanceladoOuFornecedorArquivado()
    {
        Assert.True(Vinculo().Vinculo.ElegivelParaCopia(false));
        Assert.False(Vinculo().Vinculo.ElegivelParaCopia(true));
        Assert.False(Vinculo(StatusFornecedorCasamento.Cancelado).Vinculo.ElegivelParaCopia(false));
    }

    [Fact]
    public void CopiarPara_Tarefa_DeveUsarPrazoInformadoEOrigemSomenteQuandoPedido()
    {
        var itemId = Guid.NewGuid();
        var tarefa = Tarefa(prazo: DataOrigem, origemModeloItemId: itemId);

        var comOrigem = tarefa.CopiarPara(CasamentoDestino, NovaData, preservarOrigem: true, null, Agora);
        var semOrigem = tarefa.CopiarPara(CasamentoDestino, null, preservarOrigem: false, null, Agora);

        Assert.Equal(itemId, comOrigem.OrigemModeloItemId);
        Assert.Equal(NovaData, comOrigem.Prazo);
        Assert.Null(semOrigem.OrigemModeloItemId);
        Assert.Null(semOrigem.Prazo);
    }
}
