using Celebri.Dominio.Cronogramas;

namespace Celebri.Testes.Unidade.Cronogramas;

public class RegrasCronogramaTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid CasamentoId = Guid.NewGuid();

    private static ItemCronograma Item(
        int hora,
        int minuto,
        int? duracao,
        string? responsavel = null,
        Guid? fornecedor = null,
        string atividade = "Atividade",
        DiaCronograma dia = DiaCronograma.DiaDoCasamento)
    {
        return ItemCronograma.Criar(
            CasamentoId,
            new DadosItemCronograma(dia, new TimeOnly(hora, minuto), duracao, atividade, null, responsavel, fornecedor, null, null),
            null,
            Agora);
    }

    [Fact]
    public void Detectar_MesmoResponsavelSobreposto_DeveApontarUmParaOOutro()
    {
        var cerimonia = Item(16, 30, 45, "Fernanda");
        var retoque = Item(17, 0, 20, "FERNANDA");

        var conflitos = DetectorConflitosCronograma.Detectar([cerimonia, retoque]);

        Assert.Equal(new ConflitoItem(retoque.Id, MotivoConflito.Responsavel), Assert.Single(conflitos[cerimonia.Id]));
        Assert.Equal(new ConflitoItem(cerimonia.Id, MotivoConflito.Responsavel), Assert.Single(conflitos[retoque.Id]));
    }

    [Fact]
    public void Detectar_IntervalosEncostados_NaoDeveConflitar()
    {
        var fornecedor = Guid.NewGuid();

        var conflitos = DetectorConflitosCronograma.Detectar([Item(16, 0, 30, fornecedor: fornecedor), Item(16, 30, 30, fornecedor: fornecedor)]);

        Assert.Empty(conflitos);
    }

    [Fact]
    public void Detectar_ResponsaveisDiferentesOuSemResponsavel_NaoDeveConflitar()
    {
        var conflitos = DetectorConflitosCronograma.Detectar([
            Item(16, 0, 60, "Ana"),
            Item(16, 0, 60, "Carlos"),
            Item(16, 0, 60),
            Item(16, 0, 60),
        ]);

        Assert.Empty(conflitos);
    }

    [Fact]
    public void Detectar_MesmoResponsavelEMesmoFornecedor_DeveRegistrarOsDoisMotivos()
    {
        var fornecedor = Guid.NewGuid();
        var primeiro = Item(18, 0, 60, "Carlos", fornecedor);
        var segundo = Item(18, 30, 60, "carlos", fornecedor);

        var conflitos = DetectorConflitosCronograma.Detectar([primeiro, segundo]);

        Assert.Equal([MotivoConflito.Responsavel, MotivoConflito.Fornecedor], conflitos[primeiro.Id].Select(conflito => conflito.Motivo));
    }

    [Fact]
    public void Detectar_InstantesNoMesmoHorario_DevemConflitar()
    {
        var primeiro = Item(20, 0, null, "Ana");
        var segundo = Item(20, 0, null, "Ana");
        var outroHorario = Item(20, 5, null, "Ana");

        var conflitos = DetectorConflitosCronograma.Detectar([primeiro, segundo, outroHorario]);

        Assert.Single(conflitos[primeiro.Id]);
        Assert.False(conflitos.ContainsKey(outroHorario.Id));
    }

    [Fact]
    public void Detectar_InstanteDentroDeIntervalo_DeveConflitarMasNoFimNao()
    {
        var jantar = Item(19, 0, 120, "Carlos");
        var dentro = Item(20, 0, null, "Carlos");
        var noFim = Item(21, 0, null, "Carlos");
        var noInicio = Item(19, 0, null, "Carlos");

        var conflitos = DetectorConflitosCronograma.Detectar([jantar, dentro, noFim, noInicio]);

        Assert.Equal(2, conflitos[jantar.Id].Count);
        Assert.False(conflitos.ContainsKey(noFim.Id));
        Assert.True(DetectorConflitosCronograma.SeSobrepoem(dentro, jantar));
    }

    [Fact]
    public void Detectar_ItemQueCruzaAMeiaNoite_DeveConflitarComODiaSeguinte()
    {
        var pista = Item(21, 30, 270, "DJ");
        var saida = Item(1, 0, 30, "DJ", dia: DiaCronograma.DiaSeguinte);

        Assert.True(DetectorConflitosCronograma.SeSobrepoem(pista, saida));
    }

    [Fact]
    public void Detectar_VesperaNaoConflitaComMesmoHorarioDoDia()
    {
        var montagem = Item(18, 0, 60, "Carlos", dia: DiaCronograma.Vespera);
        var jantar = Item(18, 0, 60, "Carlos");

        Assert.Empty(DetectorConflitosCronograma.Detectar([montagem, jantar]));
    }

    [Fact]
    public void Ordenar_DeveSeguirDiaInicioDuracaoEAtividade()
    {
        var vespera = Item(20, 0, 60, atividade: "Montagem", dia: DiaCronograma.Vespera);
        var cerimoniaLonga = Item(16, 30, 60, atividade: "Cerimônia");
        var cerimoniaInstante = Item(16, 30, null, atividade: "Sinal");
        var cerimoniaCurta = Item(16, 30, 15, atividade: "Bênção");
        var mesmoHorarioB = Item(16, 30, 15, atividade: "abertura");
        var seguinte = Item(0, 30, null, atividade: "Saída", dia: DiaCronograma.DiaSeguinte);

        var ordenados = OrdenacaoCronograma.Ordenar([seguinte, cerimoniaLonga, mesmoHorarioB, cerimoniaCurta, vespera, cerimoniaInstante]);

        Assert.Equal(["Montagem", "Sinal", "abertura", "Bênção", "Cerimônia", "Saída"], ordenados.Select(item => item.Atividade));
    }
}
