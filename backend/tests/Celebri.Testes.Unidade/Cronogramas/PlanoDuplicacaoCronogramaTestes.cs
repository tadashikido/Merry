using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Cronogramas;

public class PlanoDuplicacaoCronogramaTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly DataOrigem = new(2027, 5, 15);

    private static Evento NovoEvento(TimeOnly? horario, string? cerimonia = "Capela São José", string? recepcao = "Espaço Jardim")
    {
        return Evento.Criar(new DadosEvento("Ana", "João", DataOrigem, horario, cerimonia, recepcao, null, null), Agora);
    }

    private static ItemCronograma Item(Guid eventoId, int hora, int minuto, string atividade, string? local = null, Guid? fornecedor = null)
    {
        return ItemCronograma.Criar(
            eventoId,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(hora, minuto), 30, atividade, local, "Ana", fornecedor, "Instruções", "Nota interna"),
            null,
            Agora);
    }

    private static FornecedorEvento Vinculo(Guid eventoId, StatusFornecedorEvento status = StatusFornecedorEvento.Cotacao)
    {
        return FornecedorEvento.Criar(
            eventoId,
            Guid.NewGuid(),
            new DadosFornecedorEvento("Serviço", 1_000m, null, status, null),
            null,
            Agora);
    }

    [Theory]
    [InlineData(16, 0, 17, 30, 90)]
    [InlineData(17, 0, 16, 0, -60)]
    public void CalcularDeslocamento_ComOsDoisHorarios_DeveSerADiferenca(int horaOrigem, int minutoOrigem, int horaDestino, int minutoDestino, int esperado)
    {
        Assert.Equal(
            esperado,
            PlanoDuplicacaoEvento.CalcularDeslocamentoCronograma(new TimeOnly(horaOrigem, minutoOrigem), new TimeOnly(horaDestino, minutoDestino)));
    }

    [Fact]
    public void CalcularDeslocamento_SemAlgumHorario_DeveSerZero()
    {
        Assert.Equal(0, PlanoDuplicacaoEvento.CalcularDeslocamentoCronograma(null, new TimeOnly(17, 0)));
        Assert.Equal(0, PlanoDuplicacaoEvento.CalcularDeslocamentoCronograma(new TimeOnly(17, 0), null));
    }

    [Fact]
    public void MapearLocal_DeveTrocarLocaisDaOrigemPelosDoDestino()
    {
        var origem = NovoEvento(new TimeOnly(16, 0));
        var destino = NovoEvento(new TimeOnly(17, 0), "Igreja Nova", null);

        Assert.Equal("Igreja Nova", PlanoDuplicacaoEvento.MapearLocal(" capela  SAO josé ", origem, destino));
        Assert.Null(PlanoDuplicacaoEvento.MapearLocal("Espaço Jardim", origem, destino));
        Assert.Equal("Hotel Fasano", PlanoDuplicacaoEvento.MapearLocal("Hotel Fasano", origem, destino));
        Assert.Null(PlanoDuplicacaoEvento.MapearLocal(null, origem, destino));
    }

    [Fact]
    public void Montar_DeveOrdenarELimitarItensDoCronograma()
    {
        var origem = NovoEvento(new TimeOnly(16, 0));
        var itens = Enumerable.Range(0, ItemCronograma.LimitePorEvento + 5)
            .Select(indice => Item(origem.Id, 23 - (indice % 24), indice % 60, $"Item {indice}"))
            .ToList();

        var plano = PlanoDuplicacaoEvento.Montar(DataOrigem, DataOrigem, DataOrigem, [], [], itens);

        Assert.Equal(ItemCronograma.LimitePorEvento, plano.ItensCronograma.Count);
        Assert.True(plano.ItensCronograma.Zip(plano.ItensCronograma.Skip(1)).All(par => par.First.MinutoInicial <= par.Second.MinutoInicial));
    }

    [Fact]
    public void Montar_SemItens_DeveTerListaVazia()
    {
        var plano = PlanoDuplicacaoEvento.Montar(DataOrigem, null, DataOrigem, [], []);

        Assert.Empty(plano.ItensCronograma);
    }

    [Fact]
    public void GerarItensCronograma_DeveDeslocarMapearFornecedorCopiadoESemNotas()
    {
        var origem = NovoEvento(new TimeOnly(16, 0));
        var destino = NovoEvento(new TimeOnly(17, 0), "Igreja Nova", "Casa Verde");
        var copiado = Vinculo(origem.Id);
        var cancelado = Vinculo(origem.Id, StatusFornecedorEvento.Cancelado);
        var cortejo = Item(origem.Id, 16, 30, "Cortejo", "Capela São José", copiado.Id);
        var ensaio = Item(origem.Id, 15, 0, "Ensaio", "Espaço Jardim", cancelado.Id);
        var plano = PlanoDuplicacaoEvento.Montar(
            DataOrigem,
            DataOrigem,
            DataOrigem,
            [],
            [new VinculoParaDuplicar(copiado, false), new VinculoParaDuplicar(cancelado, false)],
            [cortejo, ensaio]);
        var vinculosGerados = plano.GerarVinculos(destino.Id, null, Agora);

        var itens = plano.GerarItensCronograma(origem, destino, vinculosGerados, null, Agora);

        Assert.Equal(["Ensaio", "Cortejo"], itens.Select(item => item.Atividade));
        Assert.Equal([new TimeOnly(16, 0), new TimeOnly(17, 30)], itens.Select(item => item.Inicio));
        Assert.Equal(["Casa Verde", "Igreja Nova"], itens.Select(item => item.Local));
        Assert.Null(itens[0].FornecedorEventoId);
        Assert.Equal(Assert.Single(vinculosGerados).Id, itens[1].FornecedorEventoId);
        Assert.All(itens, item => Assert.Equal(destino.Id, item.EventoId));
        Assert.All(itens, item => Assert.Null(item.NotasInternas));
        Assert.All(itens, item => Assert.Equal("Instruções", item.Instrucoes));
    }

    [Fact]
    public void GerarItensCronograma_SemVinculosCopiados_DeveIrSemFornecedor()
    {
        var origem = NovoEvento(null);
        var destino = NovoEvento(new TimeOnly(17, 0));
        var vinculo = Vinculo(origem.Id);
        var item = Item(origem.Id, 16, 30, "Cortejo", fornecedor: vinculo.Id);
        var plano = PlanoDuplicacaoEvento.Montar(DataOrigem, DataOrigem, DataOrigem, [], [], [item]);

        var itens = plano.GerarItensCronograma(origem, destino, [], null, Agora);

        var copia = Assert.Single(itens);
        Assert.Null(copia.FornecedorEventoId);
        Assert.Equal(new TimeOnly(16, 30), copia.Inicio);
    }
}
