using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Cronogramas;

public class AplicacaoModeloCronogramaTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private static Evento NovoEvento(TimeOnly? horario)
    {
        return Evento.Criar(
            new DadosEvento("Ana", "João", new DateOnly(2027, 5, 15), horario, "Capela São José", "Espaço Jardim", null, null),
            Agora);
    }

    private static ModeloCronograma Modelo()
    {
        var modelo = ModeloCronograma.Criar("Roteiro", null, new TimeOnly(16, 0), Agora);
        modelo.AdicionarItem(new DadosItemModeloCronograma(-360, 240, "Making of", null, "Hotel", "Beleza", CategoriaFornecedor.Beleza, null), Agora);
        modelo.AdicionarItem(new DadosItemModeloCronograma(0, 60, "Cerimônia", ReferenciaLocalCronograma.Cerimonia, null, "Celebrante", null, "Roteiro"), Agora);
        modelo.AdicionarItem(new DadosItemModeloCronograma(90, 30, "Fotos", ReferenciaLocalCronograma.Recepcao, null, "Fotografia", CategoriaFornecedor.Fotografia, null), Agora);
        modelo.AdicionarItem(new DadosItemModeloCronograma(330, 210, "Festa", ReferenciaLocalCronograma.Recepcao, null, "Banda", CategoriaFornecedor.Musica, null), Agora);
        return modelo;
    }

    private static ItemCronograma ItemAncorado(Evento evento, int hora, int minuto, TimeOnly cerimonia)
    {
        return ItemCronograma.CriarDeModelo(
            evento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(hora, minuto), 30, "Fotos", null, "Fotografia", null, null, null),
            Guid.NewGuid(),
            cerimonia,
            null,
            Agora);
    }

    [Fact]
    public void Gerar_DeveCalcularHorariosPelaCerimoniaResolverLocaisEGuardarOrigemEAncora()
    {
        var evento = NovoEvento(new TimeOnly(17, 0));
        var modelo = Modelo();

        var itens = GeradorItensCronograma.Gerar(
            evento,
            evento.Horario!.Value,
            modelo.ItensOrdenados(),
            new Dictionary<CategoriaFornecedor, Guid>(),
            null,
            Agora);

        Assert.Equal(["11:00", "17:00", "18:30", "22:30"], itens.Select(item => item.Inicio.ToString("HH:mm")));
        Assert.All(itens, item => Assert.Equal(DiaCronograma.DiaDoEvento, item.Dia));
        Assert.Equal(["Hotel", "Capela São José", "Espaço Jardim", "Espaço Jardim"], itens.Select(item => item.Local));
        Assert.Equal(modelo.ItensOrdenados().Select(item => (Guid?)item.Id), itens.Select(item => item.OrigemModeloItemId));
        Assert.Equal([-360, 0, 90, 330], itens.Select(item => item.MinutosRelativosCerimonia!.Value));
        Assert.All(itens, item => Assert.Equal(StatusItemCronograma.Previsto, item.Status));
        Assert.All(itens, item => Assert.Null(item.NotasInternas));
    }

    [Fact]
    public void Gerar_CerimoniaTardia_DeveLevarItensAoDiaSeguinteELimitarAJanela()
    {
        var evento = NovoEvento(new TimeOnly(23, 0));
        var modelo = ModeloCronograma.Criar("Roteiro", null, new TimeOnly(10, 0), Agora);
        var item = modelo.AdicionarItem(new DadosItemModeloCronograma(1800, null, "Brunch", null, null, null, null, null), Agora);

        var gerado = Assert.Single(GeradorItensCronograma.Gerar(evento, new TimeOnly(23, 0), [item], new Dictionary<CategoriaFornecedor, Guid>(), null, Agora));

        Assert.True(item.ForaDaJanela(new TimeOnly(23, 0)));
        Assert.Equal(DiaCronograma.DiaSeguinte, gerado.Dia);
        Assert.Equal(new TimeOnly(23, 59), gerado.Inicio);
    }

    [Fact]
    public void ItensPendentes_DeveIgnorarOrigensJaAplicadas()
    {
        var itens = Modelo().ItensOrdenados();

        var pendentes = GeradorItensCronograma.ItensPendentes(itens, [itens[0].Id, itens[2].Id]);

        Assert.Equal([itens[1].Id, itens[3].Id], pendentes.Select(item => item.Id));
    }

    [Fact]
    public void VinculoUnicoPorCategoria_SoDevePreencherCategoriaComUmUnicoVinculo()
    {
        var fotografia = Guid.NewGuid();
        var mapa = GeradorItensCronograma.VinculoUnicoPorCategoria(
        [
            (fotografia, CategoriaFornecedor.Fotografia),
            (Guid.NewGuid(), CategoriaFornecedor.Musica),
            (Guid.NewGuid(), CategoriaFornecedor.Musica),
        ]);

        Assert.Equal(fotografia, mapa[CategoriaFornecedor.Fotografia]);
        Assert.False(mapa.ContainsKey(CategoriaFornecedor.Musica));

        var itens = Modelo().ItensOrdenados();
        Assert.Null(GeradorItensCronograma.FornecedorDoItem(itens[0], mapa));
        Assert.Null(GeradorItensCronograma.FornecedorDoItem(itens[1], mapa));
        Assert.Equal(fotografia, GeradorItensCronograma.FornecedorDoItem(itens[2], mapa));
        Assert.Null(GeradorItensCronograma.FornecedorDoItem(itens[3], mapa));
    }

    [Fact]
    public void HorarioDesatualizado_DeveCompararPosicaoComAncora()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));
        var item = ItemAncorado(evento, 18, 0, new TimeOnly(16, 0));

        Assert.True(item.AncoradoEmModelo);
        Assert.Equal(120, item.MinutosRelativosCerimonia);
        Assert.False(item.HorarioDesatualizado(new TimeOnly(16, 0)));
        Assert.True(item.HorarioDesatualizado(new TimeOnly(17, 0)));
        Assert.False(item.HorarioDesatualizado(null));
    }

    [Fact]
    public void RecalcularPelaCerimonia_DeveMoverMantendoADistancia()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));
        var item = ItemAncorado(evento, 18, 0, new TimeOnly(16, 0));

        Assert.True(item.RecalcularPelaCerimonia(new TimeOnly(23, 0), Agora.AddMinutes(1)));

        Assert.Equal(DiaCronograma.DiaSeguinte, item.Dia);
        Assert.Equal(new TimeOnly(1, 0), item.Inicio);
        Assert.Equal(Agora.AddMinutes(1), item.AtualizadoEm);
        Assert.False(item.RecalcularPelaCerimonia(new TimeOnly(23, 0), Agora));
    }

    [Fact]
    public void RecalcularPelaCerimonia_ItemConcluidoOuManual_NaoDeveMover()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));
        var concluido = ItemAncorado(evento, 18, 0, new TimeOnly(16, 0));
        concluido.MarcarConcluido(Agora);
        var manual = ItemCronograma.Criar(
            evento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(18, 0), 30, "Manual", null, null, null, null, null),
            null,
            Agora);

        Assert.False(concluido.RecalcularPelaCerimonia(new TimeOnly(17, 0), Agora));
        Assert.False(manual.RecalcularPelaCerimonia(new TimeOnly(17, 0), Agora));
        Assert.Equal(new TimeOnly(18, 0), concluido.Inicio);
        Assert.Equal(new TimeOnly(18, 0), manual.Inicio);
        Assert.False(manual.AncoradoEmModelo);
    }

    [Fact]
    public void Atualizar_MovendoItemAncorado_DeveReancorarESoQuandoAPosicaoMuda()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));
        var item = ItemAncorado(evento, 18, 0, new TimeOnly(16, 0));

        item.Atualizar(
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(18, 15), 30, "Fotos", null, "Fotografia", null, null, null),
            new TimeOnly(16, 0),
            Agora);
        Assert.Equal(135, item.MinutosRelativosCerimonia);

        item.Atualizar(
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(18, 15), 30, "Fotos com a família", "Jardim", "Fotografia", null, null, null),
            new TimeOnly(17, 0),
            Agora);
        Assert.Equal(135, item.MinutosRelativosCerimonia);
        Assert.True(item.HorarioDesatualizado(new TimeOnly(17, 0)));

        item.RecalcularPelaCerimonia(new TimeOnly(17, 0), Agora);
        Assert.Equal(new TimeOnly(19, 15), item.Inicio);
    }

    [Fact]
    public void Atualizar_ItemManual_NaoDeveCriarAncora()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));
        var item = ItemCronograma.Criar(
            evento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(18, 0), 30, "Manual", null, null, null, null, null),
            null,
            Agora);

        item.Atualizar(
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(19, 0), 30, "Manual", null, null, null, null, null),
            new TimeOnly(16, 0),
            Agora);

        Assert.Null(item.MinutosRelativosCerimonia);
        Assert.False(item.HorarioDesatualizado(new TimeOnly(17, 0)));
    }

    [Fact]
    public void CopiarPara_DevePreservarOrigemEAncora()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));
        var item = ItemAncorado(evento, 18, 0, new TimeOnly(16, 0));
        var destino = NovoEvento(new TimeOnly(17, 0));

        var copia = item.CopiarPara(destino.Id, 60, null, null, null, Agora);

        Assert.Equal(item.OrigemModeloItemId, copia.OrigemModeloItemId);
        Assert.Equal(120, copia.MinutosRelativosCerimonia);
        Assert.Equal(new TimeOnly(19, 0), copia.Inicio);
        Assert.False(copia.HorarioDesatualizado(new TimeOnly(17, 0)));
    }

    [Fact]
    public void CriarDeModelo_SemOrigem_DeveLancar()
    {
        var evento = NovoEvento(new TimeOnly(16, 0));

        Assert.Throws<ArgumentException>(() => ItemCronograma.CriarDeModelo(
            evento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(18, 0), null, "Fotos", null, null, null, null, null),
            Guid.Empty,
            new TimeOnly(16, 0),
            null,
            Agora));
    }
}
