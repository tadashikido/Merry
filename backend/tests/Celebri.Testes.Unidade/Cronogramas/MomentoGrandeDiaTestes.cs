using Celebri.Dominio.Cronogramas;

namespace Celebri.Testes.Unidade.Cronogramas;

public class MomentoGrandeDiaTestes
{
    private static readonly DateOnly DataCasamento = new(2027, 5, 15);
    private static readonly DateTimeOffset Criacao = new(2027, 3, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid CasamentoId = Guid.NewGuid();

    private static ItemCronograma Item(
        int hora,
        int minuto,
        int? duracao,
        string atividade,
        DiaCronograma dia = DiaCronograma.DiaDoCasamento)
    {
        return ItemCronograma.Criar(
            CasamentoId,
            new DadosItemCronograma(dia, new TimeOnly(hora, minuto), duracao, atividade, null, null, null, null, null),
            null,
            Criacao);
    }

    private static DateTime Em(int hora, int minuto, int deslocamentoDias = 0)
    {
        return DataCasamento.AddDays(deslocamentoDias).ToDateTime(new TimeOnly(hora, minuto));
    }

    private static RetratoGrandeDia Calcular(DateTime agora, params ItemCronograma[] itens)
    {
        return MomentoGrandeDia.Calcular(OrdenacaoCronograma.Ordenar(itens), DataCasamento, agora);
    }

    [Fact]
    public void NoDia_DeveDestacarAgoraProximoEDepoisPeloHorario()
    {
        var montagem = Item(14, 0, 90, "Montagem");
        var cerimonia = Item(16, 30, 45, "Cerimônia");
        var fotos = Item(17, 15, 45, "Fotos com a família");
        var recepcao = Item(18, 0, 30, "Recepção");

        var retrato = Calcular(Em(16, 34), montagem, cerimonia, fotos, recepcao);

        Assert.Equal(FaseGrandeDia.NoDia, retrato.Fase);
        Assert.Equal((16 * 60) + 34, retrato.MinutoAtual);
        Assert.Equal(0, retrato.DiasParaOCasamento);
        Assert.Equal(SituacaoItemGrandeDia.SemMarcar, retrato.SituacaoDe(montagem));
        Assert.Equal(SituacaoItemGrandeDia.Agora, retrato.SituacaoDe(cerimonia));
        Assert.Equal(SituacaoItemGrandeDia.Proximo, retrato.SituacaoDe(fotos));
        Assert.Equal(SituacaoItemGrandeDia.Depois, retrato.SituacaoDe(recepcao));
    }

    [Fact]
    public void ItemFeito_DeveSerFeitoIndependentementeDoHorario()
    {
        var cerimonia = Item(16, 30, 45, "Cerimônia");
        var fotos = Item(17, 15, 45, "Fotos");
        var jantar = Item(19, 0, 60, "Jantar");
        cerimonia.MarcarConcluido(Criacao);
        fotos.MarcarConcluido(Criacao);

        var retrato = Calcular(Em(16, 40), cerimonia, fotos, jantar);

        Assert.Equal(SituacaoItemGrandeDia.Feito, retrato.SituacaoDe(cerimonia));
        Assert.Equal(SituacaoItemGrandeDia.Feito, retrato.SituacaoDe(fotos));
        Assert.Equal(SituacaoItemGrandeDia.Proximo, retrato.SituacaoDe(jantar));
    }

    [Fact]
    public void ItensEmParalelo_DevemSerTodosAgora()
    {
        var maquiagem = Item(16, 0, 60, "Maquiagem");
        var cerimonia = Item(16, 30, 45, "Cerimônia");

        var retrato = Calcular(Em(16, 45), maquiagem, cerimonia);

        Assert.Equal(SituacaoItemGrandeDia.Agora, retrato.SituacaoDe(maquiagem));
        Assert.Equal(SituacaoItemGrandeDia.Agora, retrato.SituacaoDe(cerimonia));
    }

    [Fact]
    public void ItemSemDuracao_DeveTerminarNoInicioDoProximoItemPosterior()
    {
        var chegada = Item(15, 0, null, "Chegada dos padrinhos");
        var simultaneo = Item(15, 0, null, "Abertura do salão");
        var cerimonia = Item(16, 30, 45, "Cerimônia");

        var durante = Calcular(Em(16, 0), chegada, simultaneo, cerimonia);
        var depois = Calcular(Em(16, 30), chegada, simultaneo, cerimonia);

        Assert.Equal(SituacaoItemGrandeDia.Agora, durante.SituacaoDe(chegada));
        Assert.Equal(SituacaoItemGrandeDia.Agora, durante.SituacaoDe(simultaneo));
        Assert.Equal(SituacaoItemGrandeDia.SemMarcar, depois.SituacaoDe(chegada));
        Assert.Equal(SituacaoItemGrandeDia.Agora, depois.SituacaoDe(cerimonia));
    }

    [Fact]
    public void UltimoItemSemDuracao_DeveDurarAteOFimDaJanela()
    {
        var pista = Item(23, 0, null, "Pista");

        var retrato = Calcular(Em(23, 59), pista);

        Assert.Equal(FaseGrandeDia.NoDia, retrato.Fase);
        Assert.Equal(SituacaoItemGrandeDia.Agora, retrato.SituacaoDe(pista));
    }

    [Fact]
    public void ItemQueCruzaAMeiaNoite_DeveManterODiaSeguinteNaJanela()
    {
        var pista = Item(21, 30, 270, "Pista");

        var madrugada = Calcular(Em(1, 30, 1), pista);
        var manha = Calcular(Em(9, 0, 1), pista);
        var diaDepois = Calcular(Em(0, 0, 2), pista);

        Assert.Equal(FaseGrandeDia.NoDia, madrugada.Fase);
        Assert.Equal(SituacaoItemGrandeDia.Agora, madrugada.SituacaoDe(pista));
        Assert.Equal(FaseGrandeDia.NoDia, manha.Fase);
        Assert.Equal(SituacaoItemGrandeDia.SemMarcar, manha.SituacaoDe(pista));
        Assert.Equal(FaseGrandeDia.DepoisDoDia, diaDepois.Fase);
        Assert.Equal(-2, diaDepois.DiasParaOCasamento);
    }

    [Fact]
    public void Vespera_DeveAbrirAJanelaNoDiaAnteriorQuandoHaItemNaVespera()
    {
        var ensaio = Item(19, 0, 60, "Ensaio", DiaCronograma.Vespera);
        var cerimonia = Item(16, 30, 45, "Cerimônia");

        var vesperaManha = Calcular(Em(8, 0, -1), ensaio, cerimonia);
        var semVespera = Calcular(Em(8, 0, -1), cerimonia);

        Assert.Equal(FaseGrandeDia.NoDia, vesperaManha.Fase);
        Assert.Equal(SituacaoItemGrandeDia.Proximo, vesperaManha.SituacaoDe(ensaio));
        Assert.Equal(SituacaoItemGrandeDia.Depois, vesperaManha.SituacaoDe(cerimonia));
        Assert.Equal(FaseGrandeDia.AntesDoDia, semVespera.Fase);
        Assert.Equal(1, semVespera.DiasParaOCasamento);
    }

    [Fact]
    public void AntesDoDia_DeveTerTodosOsPendentesComoDepoisEContarOsDias()
    {
        var cerimonia = Item(16, 30, 45, "Cerimônia");
        var feito = Item(10, 0, 30, "Prova do vestido");
        feito.MarcarConcluido(Criacao);

        var retrato = Calcular(Em(10, 0, -12), cerimonia, feito);

        Assert.Equal(FaseGrandeDia.AntesDoDia, retrato.Fase);
        Assert.Equal(12, retrato.DiasParaOCasamento);
        Assert.Equal(SituacaoItemGrandeDia.Depois, retrato.SituacaoDe(cerimonia));
        Assert.Equal(SituacaoItemGrandeDia.Feito, retrato.SituacaoDe(feito));
    }

    [Fact]
    public void DepoisDoDia_DeveMarcarPendentesComoSemMarcar()
    {
        var cerimonia = Item(16, 30, 45, "Cerimônia");
        var jantar = Item(19, 0, 60, "Jantar");
        cerimonia.MarcarConcluido(Criacao);

        var retrato = Calcular(Em(12, 0, 3), cerimonia, jantar);

        Assert.Equal(FaseGrandeDia.DepoisDoDia, retrato.Fase);
        Assert.Equal(-3, retrato.DiasParaOCasamento);
        Assert.Equal(SituacaoItemGrandeDia.Feito, retrato.SituacaoDe(cerimonia));
        Assert.Equal(SituacaoItemGrandeDia.SemMarcar, retrato.SituacaoDe(jantar));
    }

    [Fact]
    public void SemItens_JanelaDeveSerODiaDoCasamento()
    {
        Assert.Equal(FaseGrandeDia.AntesDoDia, Calcular(Em(23, 59, -1)).Fase);
        Assert.Equal(FaseGrandeDia.NoDia, Calcular(Em(0, 0)).Fase);
        Assert.Equal(FaseGrandeDia.NoDia, Calcular(Em(23, 59)).Fase);
        Assert.Equal(FaseGrandeDia.DepoisDoDia, Calcular(Em(0, 0, 1)).Fase);
    }

    [Fact]
    public void LimitesDaJanela_DevemSerCalculadosPorDiaInteiro()
    {
        var itens = OrdenacaoCronograma.Ordenar(
        [
            Item(19, 0, 60, "Ensaio", DiaCronograma.Vespera),
            Item(23, 0, 120, "Pista"),
        ]);

        Assert.Equal(-ItemCronograma.MinutosPorDia, MomentoGrandeDia.InicioJanela(itens));
        Assert.Equal(2 * ItemCronograma.MinutosPorDia, MomentoGrandeDia.FimJanela(itens));
        Assert.Equal(0, MomentoGrandeDia.InicioJanela([]));
        Assert.Equal(ItemCronograma.MinutosPorDia, MomentoGrandeDia.FimJanela([]));
    }

    [Fact]
    public void ItemTerminandoExatamenteNaMeiaNoite_NaoDeveEstenderAJanela()
    {
        var festa = Item(22, 0, 120, "Festa");

        Assert.Equal(ItemCronograma.MinutosPorDia, MomentoGrandeDia.FimJanela([festa]));
        Assert.Equal(FaseGrandeDia.DepoisDoDia, Calcular(Em(0, 0, 1), festa).Fase);
    }

    [Fact]
    public void SituacaoDe_ItemForaDoRetrato_DeveSerDepois()
    {
        var retrato = Calcular(Em(10, 0));

        Assert.Equal(SituacaoItemGrandeDia.Depois, retrato.SituacaoDe(Item(10, 0, 30, "Outro")));
        Assert.Throws<ArgumentNullException>(() => retrato.SituacaoDe(null!));
        Assert.Throws<ArgumentNullException>(() => MomentoGrandeDia.Calcular(null!, DataCasamento, Em(10, 0)));
    }
}
