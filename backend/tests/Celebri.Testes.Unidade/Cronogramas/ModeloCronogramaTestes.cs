using Celebri.Dominio.Eventos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Cronogramas;

public class ModeloCronogramaTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private static Evento NovoEvento(TimeOnly? horario, string? cerimonia = "Capela São José", string? recepcao = "Espaço Jardim")
    {
        return Evento.Criar(new DadosEvento("Ana", "João", new DateOnly(2027, 5, 15), horario, cerimonia, recepcao, null, null), Agora);
    }

    private static DadosItemModeloCronograma Dados(
        int minutos,
        string atividade = "Cerimônia",
        int? duracao = 60,
        ReferenciaLocalCronograma? referencia = null,
        string? local = null,
        CategoriaFornecedor? categoria = null)
    {
        return new DadosItemModeloCronograma(minutos, duracao, atividade, referencia, local, "Assessoria", categoria, "Instruções");
    }

    private static ItemCronograma ItemEvento(Guid eventoId, DiaCronograma dia, int hora, int minuto, string atividade, string? local = null, Guid? fornecedor = null)
    {
        return ItemCronograma.Criar(
            eventoId,
            new DadosItemCronograma(dia, new TimeOnly(hora, minuto), 30, atividade, local, "Fernanda", fornecedor, "Instruções", "Nota interna"),
            null,
            Agora);
    }

    [Fact]
    public void Criar_SemHorarioDeReferencia_DeveUsar16Horas()
    {
        var modelo = ModeloCronograma.Criar("  Roteiro   fazenda ", " Descrição ", null, Agora);

        Assert.Equal("Roteiro fazenda", modelo.Nome);
        Assert.Equal("Descrição", modelo.Descricao);
        Assert.Equal(new TimeOnly(16, 0), modelo.HorarioReferencia);
        Assert.False(modelo.Sugerido);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    [InlineData("A")]
    public void Criar_NomeInvalido_DeveLancarComCampoNome(string? nome)
    {
        var erro = Assert.Throws<RegraNegocioException>(() => ModeloCronograma.Criar(nome, null, null, Agora));

        Assert.Equal(ModeloCronograma.CampoNome, erro.Campo);
    }

    [Fact]
    public void Criar_DescricaoAcimaDoLimite_DeveLancar()
    {
        Assert.Throws<RegraNegocioException>(() => ModeloCronograma.Criar("Roteiro", new string('a', 501), null, Agora));
    }

    [Fact]
    public void AdicionarItem_DeveGuardarMinutosELimparLocalQuandoHaReferencia()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, new TimeOnly(16, 0), Agora);

        var item = modelo.AdicionarItem(Dados(-360, "Making of", referencia: ReferenciaLocalCronograma.Cerimonia, local: "Ignorado"), Agora);

        Assert.Equal(-360, item.MinutosDesdeCerimonia);
        Assert.Equal(ReferenciaLocalCronograma.Cerimonia, item.ReferenciaLocal);
        Assert.Null(item.Local);
        Assert.Equal(modelo.Id, item.ModeloId);
    }

    [Theory]
    [InlineData(-2500)]
    [InlineData(1920)]
    [InlineData(3000)]
    public void AdicionarItem_ForaDaJanelaDaReferencia_DeveLancarComCampoMinutos(int minutos)
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, new TimeOnly(16, 0), Agora);

        var erro = Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Dados(minutos), Agora));

        Assert.Equal(ItemModeloCronograma.CampoMinutos, erro.Campo);
    }

    [Fact]
    public void AdicionarItem_ValidacoesDoItem_DevemApontarOCampo()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, null, Agora);

        Assert.Equal(ItemCronograma.CampoAtividade, Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Dados(0, " "), Agora)).Campo);
        Assert.Equal(ItemCronograma.CampoDuracao, Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Dados(0, duracao: 4), Agora)).Campo);
        Assert.Equal(
            ItemModeloCronograma.CampoCategoriaFornecedor,
            Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Dados(0, categoria: (CategoriaFornecedor)99), Agora)).Campo);
        Assert.Equal(
            ItemModeloCronograma.CampoReferenciaLocal,
            Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Dados(0, referencia: (ReferenciaLocalCronograma)9), Agora)).Campo);
    }

    [Fact]
    public void AdicionarItem_AcimaDe200_DeveLancar()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, null, Agora);
        for (var indice = 0; indice < ModeloCronograma.LimiteItens; indice++)
        {
            modelo.AdicionarItem(Dados(indice, $"Item {indice}"), Agora);
        }

        var erro = Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Dados(0, "Excedente"), Agora));

        Assert.Equal(MensagensModeloCronograma.LimiteItens, erro.Message);
    }

    [Fact]
    public void Atualizar_ReferenciaQueTiraItemDaJanela_DeveLancarSemAlterar()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, new TimeOnly(16, 0), Agora);
        modelo.AdicionarItem(Dados(1500, "Brunch do dia seguinte"), Agora);

        var erro = Assert.Throws<RegraNegocioException>(() => modelo.Atualizar("Roteiro", null, new TimeOnly(23, 30), Agora));

        Assert.Equal(ModeloCronograma.CampoHorarioReferencia, erro.Campo);
        Assert.Equal(new TimeOnly(16, 0), modelo.HorarioReferencia);
    }

    [Fact]
    public void Atualizar_ReferenciaValida_NaoDeveAlterarMinutosDosItens()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, new TimeOnly(16, 0), Agora);
        var item = modelo.AdicionarItem(Dados(-60), Agora);

        modelo.Atualizar("Roteiro novo", "Nova", new TimeOnly(18, 0), Agora);

        Assert.Equal(new TimeOnly(18, 0), modelo.HorarioReferencia);
        Assert.Equal(-60, item.MinutosDesdeCerimonia);
    }

    [Fact]
    public void ItensOrdenados_DeveOrdenarPelaPosicaoRelativa()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, null, Agora);
        modelo.AdicionarItem(Dados(60, "Cumprimentos"), Agora);
        modelo.AdicionarItem(Dados(-360, "Making of"), Agora);
        modelo.AdicionarItem(Dados(0, "Cerimônia"), Agora);

        Assert.Equal(["Making of", "Cerimônia", "Cumprimentos"], modelo.ItensOrdenados().Select(item => item.Atividade));
    }

    [Fact]
    public void AtualizarERemoverItem_DeOutroModelo_DeveLancar()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, null, Agora);
        var outro = ModeloCronograma.Criar("Outro", null, null, Agora);
        var item = outro.AdicionarItem(Dados(0), Agora);

        Assert.Throws<InvalidOperationException>(() => modelo.AtualizarItem(item, Dados(10), Agora));
        Assert.Throws<InvalidOperationException>(() => modelo.RemoverItem(item, Agora));
    }

    [Fact]
    public void CriarDeCronograma_DeveGuardarDistanciaLocaisCategoriaESemNotas()
    {
        var evento = NovoEvento(new TimeOnly(16, 30));
        var vinculo = Guid.NewGuid();
        var itens = new[]
        {
            ItemEvento(evento.Id, DiaCronograma.DiaDoEvento, 16, 30, "Cerimônia", " capela  sao josé "),
            ItemEvento(evento.Id, DiaCronograma.Vespera, 19, 0, "Ensaio", "Espaço Jardim"),
            ItemEvento(evento.Id, DiaCronograma.DiaSeguinte, 1, 0, "Saída", "Hotel Fasano", vinculo),
        };

        var modelo = ModeloCronograma.CriarDeCronograma(
            "Roteiro fazenda",
            null,
            evento,
            itens,
            new Dictionary<Guid, CategoriaFornecedor> { [vinculo] = CategoriaFornecedor.Transporte },
            Agora);

        Assert.Equal(new TimeOnly(16, 30), modelo.HorarioReferencia);
        var ordenados = modelo.ItensOrdenados();
        Assert.Equal([-1290, 0, 510], ordenados.Select(item => item.MinutosDesdeCerimonia));
        Assert.Equal(ReferenciaLocalCronograma.Recepcao, ordenados[0].ReferenciaLocal);
        Assert.Equal(ReferenciaLocalCronograma.Cerimonia, ordenados[1].ReferenciaLocal);
        Assert.Null(ordenados[2].ReferenciaLocal);
        Assert.Equal("Hotel Fasano", ordenados[2].Local);
        Assert.Equal(CategoriaFornecedor.Transporte, ordenados[2].CategoriaFornecedor);
        Assert.Null(ordenados[0].CategoriaFornecedor);
        Assert.All(ordenados, item => Assert.Equal("Instruções", item.Instrucoes));
    }

    [Fact]
    public void CriarDeCronograma_SemHorario_DeveLancarComCampoHorario()
    {
        var evento = NovoEvento(null);

        var erro = Assert.Throws<RegraNegocioException>(() => ModeloCronograma.CriarDeCronograma(
            "Roteiro",
            null,
            evento,
            [ItemEvento(evento.Id, DiaCronograma.DiaDoEvento, 16, 0, "Cerimônia")],
            new Dictionary<Guid, CategoriaFornecedor>(),
            Agora));

        Assert.Equal("horario", erro.Campo);
        Assert.Equal(MensagensModeloCronograma.HorarioCerimoniaObrigatorio, erro.Message);
    }

    [Fact]
    public void CriarDeCronograma_SemItens_DeveLancar()
    {
        var erro = Assert.Throws<RegraNegocioException>(() => ModeloCronograma.CriarDeCronograma(
            "Roteiro",
            null,
            NovoEvento(new TimeOnly(16, 0)),
            [],
            new Dictionary<Guid, CategoriaFornecedor>(),
            Agora));

        Assert.Equal(MensagensModeloCronograma.CronogramaVazio, erro.Message);
    }

    [Fact]
    public void Sugerido_DeveTerOsMomentosDoDiaSemConflitosNaReferencia()
    {
        var modelo = ModeloCronogramaSugerido.Criar(TipoEvento.Casamento, Agora);
        var evento = NovoEvento(modelo.HorarioReferencia);
        var itens = modelo.ItensOrdenados()
            .Select(item => ItemCronograma.Criar(evento.Id, item.ParaDadosItem(evento, modelo.HorarioReferencia, null), null, Agora))
            .ToList();

        Assert.True(modelo.Sugerido);
        Assert.Equal(ModeloCronogramaSugerido.Casamento.Nome, modelo.Nome);
        Assert.Equal(20, modelo.Itens.Count);
        Assert.Contains(modelo.Itens, item => item.MinutosDesdeCerimonia == 0 && item.Atividade == "Cerimônia");
        Assert.Contains(modelo.Itens, item => item.Atividade.Contains("Making of", StringComparison.Ordinal));
        Assert.Contains(modelo.Itens, item => item.Atividade.Contains("bolo", StringComparison.Ordinal));
        Assert.Contains(modelo.Itens, item => item.Atividade.Contains("Encerramento", StringComparison.Ordinal));
        Assert.Empty(DetectorConflitosCronograma.Detectar(itens));
    }
}
