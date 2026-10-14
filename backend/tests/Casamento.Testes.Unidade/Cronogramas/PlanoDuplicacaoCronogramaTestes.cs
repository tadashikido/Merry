using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Fornecedores;

namespace Casamento.Testes.Unidade.Cronogramas;

public class PlanoDuplicacaoCronogramaTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly DataOrigem = new(2027, 5, 15);

    private static CasamentoAssessorado Casamento(TimeOnly? horario, string? cerimonia = "Capela São José", string? recepcao = "Espaço Jardim")
    {
        return CasamentoAssessorado.Criar(new DadosCasamento("Ana", "João", DataOrigem, horario, cerimonia, recepcao, null, null), Agora);
    }

    private static ItemCronograma Item(Guid casamentoId, int hora, int minuto, string atividade, string? local = null, Guid? fornecedor = null)
    {
        return ItemCronograma.Criar(
            casamentoId,
            new DadosItemCronograma(DiaCronograma.DiaDoCasamento, new TimeOnly(hora, minuto), 30, atividade, local, "Ana", fornecedor, "Instruções", "Nota interna"),
            null,
            Agora);
    }

    private static FornecedorCasamento Vinculo(Guid casamentoId, StatusFornecedorCasamento status = StatusFornecedorCasamento.Cotacao)
    {
        return FornecedorCasamento.Criar(
            casamentoId,
            Guid.NewGuid(),
            new DadosFornecedorCasamento("Serviço", 1_000m, null, status, null),
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
            PlanoDuplicacaoCasamento.CalcularDeslocamentoCronograma(new TimeOnly(horaOrigem, minutoOrigem), new TimeOnly(horaDestino, minutoDestino)));
    }

    [Fact]
    public void CalcularDeslocamento_SemAlgumHorario_DeveSerZero()
    {
        Assert.Equal(0, PlanoDuplicacaoCasamento.CalcularDeslocamentoCronograma(null, new TimeOnly(17, 0)));
        Assert.Equal(0, PlanoDuplicacaoCasamento.CalcularDeslocamentoCronograma(new TimeOnly(17, 0), null));
    }

    [Fact]
    public void MapearLocal_DeveTrocarLocaisDaOrigemPelosDoDestino()
    {
        var origem = Casamento(new TimeOnly(16, 0));
        var destino = Casamento(new TimeOnly(17, 0), "Igreja Nova", null);

        Assert.Equal("Igreja Nova", PlanoDuplicacaoCasamento.MapearLocal(" capela  SAO josé ", origem, destino));
        Assert.Null(PlanoDuplicacaoCasamento.MapearLocal("Espaço Jardim", origem, destino));
        Assert.Equal("Hotel Fasano", PlanoDuplicacaoCasamento.MapearLocal("Hotel Fasano", origem, destino));
        Assert.Null(PlanoDuplicacaoCasamento.MapearLocal(null, origem, destino));
    }

    [Fact]
    public void Montar_DeveOrdenarELimitarItensDoCronograma()
    {
        var origem = Casamento(new TimeOnly(16, 0));
        var itens = Enumerable.Range(0, ItemCronograma.LimitePorCasamento + 5)
            .Select(indice => Item(origem.Id, 23 - (indice % 24), indice % 60, $"Item {indice}"))
            .ToList();

        var plano = PlanoDuplicacaoCasamento.Montar(DataOrigem, DataOrigem, DataOrigem, [], [], itens);

        Assert.Equal(ItemCronograma.LimitePorCasamento, plano.ItensCronograma.Count);
        Assert.True(plano.ItensCronograma.Zip(plano.ItensCronograma.Skip(1)).All(par => par.First.MinutoInicial <= par.Second.MinutoInicial));
    }

    [Fact]
    public void Montar_SemItens_DeveTerListaVazia()
    {
        var plano = PlanoDuplicacaoCasamento.Montar(DataOrigem, null, DataOrigem, [], []);

        Assert.Empty(plano.ItensCronograma);
    }

    [Fact]
    public void GerarItensCronograma_DeveDeslocarMapearFornecedorCopiadoESemNotas()
    {
        var origem = Casamento(new TimeOnly(16, 0));
        var destino = Casamento(new TimeOnly(17, 0), "Igreja Nova", "Casa Verde");
        var copiado = Vinculo(origem.Id);
        var cancelado = Vinculo(origem.Id, StatusFornecedorCasamento.Cancelado);
        var cortejo = Item(origem.Id, 16, 30, "Cortejo", "Capela São José", copiado.Id);
        var ensaio = Item(origem.Id, 15, 0, "Ensaio", "Espaço Jardim", cancelado.Id);
        var plano = PlanoDuplicacaoCasamento.Montar(
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
        Assert.Null(itens[0].FornecedorCasamentoId);
        Assert.Equal(Assert.Single(vinculosGerados).Id, itens[1].FornecedorCasamentoId);
        Assert.All(itens, item => Assert.Equal(destino.Id, item.CasamentoId));
        Assert.All(itens, item => Assert.Null(item.NotasInternas));
        Assert.All(itens, item => Assert.Equal("Instruções", item.Instrucoes));
    }

    [Fact]
    public void GerarItensCronograma_SemVinculosCopiados_DeveIrSemFornecedor()
    {
        var origem = Casamento(null);
        var destino = Casamento(new TimeOnly(17, 0));
        var vinculo = Vinculo(origem.Id);
        var item = Item(origem.Id, 16, 30, "Cortejo", fornecedor: vinculo.Id);
        var plano = PlanoDuplicacaoCasamento.Montar(DataOrigem, DataOrigem, DataOrigem, [], [], [item]);

        var itens = plano.GerarItensCronograma(origem, destino, [], null, Agora);

        var copia = Assert.Single(itens);
        Assert.Null(copia.FornecedorCasamentoId);
        Assert.Equal(new TimeOnly(16, 30), copia.Inicio);
    }
}
