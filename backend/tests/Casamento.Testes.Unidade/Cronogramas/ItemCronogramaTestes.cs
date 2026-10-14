using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Excecoes;

namespace Casamento.Testes.Unidade.Cronogramas;

public class ItemCronogramaTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid CasamentoId = Guid.NewGuid();

    public static DadosItemCronograma Dados(
        DiaCronograma dia = DiaCronograma.DiaDoCasamento,
        int hora = 16,
        int minuto = 30,
        int? duracao = 45,
        string? atividade = "Cerimônia",
        string? local = "Capela",
        string? responsavel = "Fernanda",
        Guid? fornecedor = null,
        string? instrucoes = "Chegar antes",
        string? notas = "Nota interna")
    {
        return new DadosItemCronograma(dia, new TimeOnly(hora, minuto), duracao, atividade, local, responsavel, fornecedor, instrucoes, notas);
    }

    private static ItemCronograma Criar(DadosItemCronograma? dados = null)
    {
        return ItemCronograma.Criar(CasamentoId, dados ?? Dados(), Guid.NewGuid(), Agora);
    }

    [Fact]
    public void Criar_DeveNormalizarTextosEComecarPrevisto()
    {
        var item = Criar(Dados(atividade: "  Entrada   dos noivos ", local: "  Capela  ", responsavel: " Fernanda  Lima ", instrucoes: "  ", notas: " nota ")
            with { Inicio = new TimeOnly(16, 30, 45) });

        Assert.NotEqual(Guid.Empty, item.Id);
        Assert.Equal(CasamentoId, item.CasamentoId);
        Assert.Equal("Entrada dos noivos", item.Atividade);
        Assert.Equal("Capela", item.Local);
        Assert.Equal("Fernanda Lima", item.Responsavel);
        Assert.Equal("fernanda lima", item.ResponsavelChave);
        Assert.Null(item.Instrucoes);
        Assert.Equal("nota", item.NotasInternas);
        Assert.Equal(new TimeOnly(16, 30), item.Inicio);
        Assert.Equal(StatusItemCronograma.Previsto, item.Status);
        Assert.Null(item.ConcluidoEm);
        Assert.Equal(Agora, item.CriadoEm);
    }

    [Fact]
    public void Criar_ChaveDoResponsavelDeveIgnorarAcentosECaixa()
    {
        var item = Criar(Dados(responsavel: "JOSÉ  Antônio"));

        Assert.Equal("jose antonio", item.ResponsavelChave);
    }

    [Fact]
    public void Criar_SemCasamento_DeveLancar()
    {
        Assert.Throws<ArgumentException>(() => ItemCronograma.Criar(Guid.Empty, Dados(), null, Agora));
    }

    [Theory]
    [InlineData(null, ItemCronograma.CampoAtividade)]
    [InlineData("   ", ItemCronograma.CampoAtividade)]
    [InlineData("A", ItemCronograma.CampoAtividade)]
    public void Criar_AtividadeInvalida_DeveLancarComCampo(string? atividade, string campo)
    {
        var erro = Assert.Throws<RegraNegocioException>(() => Criar(Dados(atividade: atividade)));

        Assert.Equal(campo, erro.Campo);
    }

    [Fact]
    public void Criar_AtividadeLongaDemais_DeveLancar()
    {
        var erro = Assert.Throws<RegraNegocioException>(() => Criar(Dados(atividade: new string('a', 161))));

        Assert.Equal(MensagensCronograma.TamanhoAtividade, erro.Message);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(1441)]
    [InlineData(0)]
    [InlineData(-10)]
    public void Criar_DuracaoForaDaFaixa_DeveLancar(int duracao)
    {
        var erro = Assert.Throws<RegraNegocioException>(() => Criar(Dados(duracao: duracao)));

        Assert.Equal(ItemCronograma.CampoDuracao, erro.Campo);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(1440)]
    public void Criar_DuracaoNosLimites_DeveAceitar(int duracao)
    {
        Assert.Equal(duracao, Criar(Dados(duracao: duracao)).DuracaoMinutos);
    }

    [Fact]
    public void Criar_DiaInvalido_DeveLancar()
    {
        var erro = Assert.Throws<RegraNegocioException>(() => Criar(Dados(dia: (DiaCronograma)5)));

        Assert.Equal(ItemCronograma.CampoDia, erro.Campo);
    }

    [Fact]
    public void Criar_TextosLongosDemais_DevemLancarComCampo()
    {
        Assert.Equal(ItemCronograma.CampoLocal, Assert.Throws<RegraNegocioException>(() => Criar(Dados(local: new string('l', 201)))).Campo);
        Assert.Equal(ItemCronograma.CampoResponsavel, Assert.Throws<RegraNegocioException>(() => Criar(Dados(responsavel: new string('r', 121)))).Campo);
        Assert.Equal(ItemCronograma.CampoInstrucoes, Assert.Throws<RegraNegocioException>(() => Criar(Dados(instrucoes: new string('i', 2001)))).Campo);
        Assert.Equal(ItemCronograma.CampoNotasInternas, Assert.Throws<RegraNegocioException>(() => Criar(Dados(notas: new string('n', 2001)))).Campo);
    }

    [Fact]
    public void Criar_FornecedorVazio_DeveLancar()
    {
        var erro = Assert.Throws<RegraNegocioException>(() => Criar(Dados(fornecedor: Guid.Empty)));

        Assert.Equal(ItemCronograma.CampoFornecedor, erro.Campo);
    }

    [Theory]
    [InlineData(DiaCronograma.Vespera, 18, 0, -360)]
    [InlineData(DiaCronograma.DiaDoCasamento, 16, 30, 990)]
    [InlineData(DiaCronograma.DiaSeguinte, 1, 30, 1530)]
    public void MinutoInicial_DeveConsiderarODia(DiaCronograma dia, int hora, int minuto, int esperado)
    {
        Assert.Equal(esperado, Criar(Dados(dia: dia, hora: hora, minuto: minuto)).MinutoInicial);
    }

    [Fact]
    public void Termino_QueCruzaAMeiaNoite_DeveIndicarOutroDia()
    {
        var pista = Criar(Dados(hora: 21, minuto: 30, duracao: 270));
        var cerimonia = Criar(Dados());
        var instante = Criar(Dados(duracao: null));
        var ateMeiaNoite = Criar(Dados(hora: 23, minuto: 0, duracao: 60));

        Assert.Equal(new TimeOnly(2, 0), pista.Termino);
        Assert.True(pista.TerminaEmOutroDia);
        Assert.Equal(1290 + 270, pista.MinutoFinal);
        Assert.Equal(new TimeOnly(17, 15), cerimonia.Termino);
        Assert.False(cerimonia.TerminaEmOutroDia);
        Assert.Null(instante.Termino);
        Assert.False(instante.TerminaEmOutroDia);
        Assert.Equal(instante.MinutoInicial, instante.MinutoFinal);
        Assert.True(ateMeiaNoite.TerminaEmOutroDia);
    }

    [Fact]
    public void CalcularData_DeveDeslocarPelaDataDoCasamento()
    {
        var data = new DateOnly(2027, 5, 15);

        Assert.Equal(data.AddDays(-1), Criar(Dados(dia: DiaCronograma.Vespera)).CalcularData(data));
        Assert.Equal(data, Criar(Dados()).CalcularData(data));
        Assert.Equal(data.AddDays(1), Criar(Dados(dia: DiaCronograma.DiaSeguinte)).CalcularData(data));
    }

    [Fact]
    public void MinutosDesdeCerimonia_DeveSerRelativoAoHorario()
    {
        var making = Criar(Dados(hora: 13, minuto: 0));
        var vespera = Criar(Dados(dia: DiaCronograma.Vespera, hora: 18, minuto: 0));

        Assert.Equal(-210, making.MinutosDesdeCerimonia(new TimeOnly(16, 30)));
        Assert.Equal(-1350, vespera.MinutosDesdeCerimonia(new TimeOnly(16, 30)));
        Assert.Null(making.MinutosDesdeCerimonia(null));
    }

    [Fact]
    public void MarcarConcluidoEReabrir_DevemManterStatusEDataCoerentes()
    {
        var item = Criar();
        var depois = Agora.AddHours(3);

        item.MarcarConcluido(depois);
        item.MarcarConcluido(depois.AddHours(1));

        Assert.Equal(StatusItemCronograma.Concluido, item.Status);
        Assert.Equal(depois, item.ConcluidoEm);

        item.Reabrir(depois.AddHours(2));
        item.Reabrir(depois.AddHours(3));

        Assert.Equal(StatusItemCronograma.Previsto, item.Status);
        Assert.Null(item.ConcluidoEm);
        Assert.Equal(depois.AddHours(2), item.AtualizadoEm);
    }

    [Fact]
    public void Atualizar_DeveRecalcularChaveDoResponsavel()
    {
        var item = Criar();

        item.Atualizar(Dados(responsavel: null, atividade: "Fotos"), Agora.AddMinutes(5));

        Assert.Null(item.Responsavel);
        Assert.Null(item.ResponsavelChave);
        Assert.Equal("Fotos", item.Atividade);
        Assert.Equal(Agora.AddMinutes(5), item.AtualizadoEm);
    }

    [Fact]
    public void CopiarPara_DeveDeslocarSemNotasEStatusPrevisto()
    {
        var item = Criar(Dados(hora: 23, minuto: 30, duracao: 120));
        item.MarcarConcluido(Agora);
        var destino = Guid.NewGuid();
        var vinculo = Guid.NewGuid();

        var copia = item.CopiarPara(destino, 60, "Casa Verde", vinculo, null, Agora.AddDays(1));

        Assert.NotEqual(item.Id, copia.Id);
        Assert.Equal(destino, copia.CasamentoId);
        Assert.Equal(DiaCronograma.DiaSeguinte, copia.Dia);
        Assert.Equal(new TimeOnly(0, 30), copia.Inicio);
        Assert.Equal(120, copia.DuracaoMinutos);
        Assert.Equal("Casa Verde", copia.Local);
        Assert.Equal(vinculo, copia.FornecedorCasamentoId);
        Assert.Equal("Fernanda", copia.Responsavel);
        Assert.Equal("Chegar antes", copia.Instrucoes);
        Assert.Null(copia.NotasInternas);
        Assert.Equal(StatusItemCronograma.Previsto, copia.Status);
        Assert.Null(copia.ConcluidoEm);
    }

    [Fact]
    public void CopiarPara_DeslocamentoForaDosLimites_DeveLimitar()
    {
        var cedo = Criar(Dados(dia: DiaCronograma.Vespera, hora: 1, minuto: 0));
        var tarde = Criar(Dados(dia: DiaCronograma.DiaSeguinte, hora: 23, minuto: 0));

        var antes = cedo.CopiarPara(Guid.NewGuid(), -600, null, null, null, Agora);
        var depois = tarde.CopiarPara(Guid.NewGuid(), 600, null, null, null, Agora);

        Assert.Equal((DiaCronograma.Vespera, new TimeOnly(0, 0)), (antes.Dia, antes.Inicio));
        Assert.Equal((DiaCronograma.DiaSeguinte, new TimeOnly(23, 59)), (depois.Dia, depois.Inicio));
    }

    [Theory]
    [InlineData(-1440, DiaCronograma.Vespera, 0, 0)]
    [InlineData(-1, DiaCronograma.Vespera, 23, 59)]
    [InlineData(0, DiaCronograma.DiaDoCasamento, 0, 0)]
    [InlineData(1439, DiaCronograma.DiaDoCasamento, 23, 59)]
    [InlineData(1440, DiaCronograma.DiaSeguinte, 0, 0)]
    [InlineData(2879, DiaCronograma.DiaSeguinte, 23, 59)]
    public void DePosicao_DeveConverterMinutoAbsoluto(int minuto, DiaCronograma dia, int hora, int minutos)
    {
        Assert.Equal((dia, new TimeOnly(hora, minutos)), ItemCronograma.DePosicao(minuto));
    }

    [Theory]
    [InlineData(-1441)]
    [InlineData(2880)]
    public void DePosicao_ForaDaFaixa_DeveLancar(int minuto)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => ItemCronograma.DePosicao(minuto));
    }
}
