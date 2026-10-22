using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresEvento;

public static class CalculadoraResumoOrcamento
{
    public static ResumoOrcamentoDto Calcular(IEnumerable<VinculoFornecedor> vinculos)
    {
        return Calcular(vinculos, [], DateOnly.MinValue);
    }

    public static ResumoOrcamentoDto Calcular(
        IEnumerable<VinculoFornecedor> vinculos,
        IEnumerable<ParcelaFornecedor> parcelas,
        DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(vinculos);
        ArgumentNullException.ThrowIfNull(parcelas);

        var considerados = vinculos.Where(item => !item.Vinculo.Cancelado).ToList();
        var parcelasPorVinculo = parcelas
            .GroupBy(parcela => parcela.FornecedorEventoId)
            .ToDictionary(grupo => grupo.Key, grupo => (IReadOnlyList<ParcelaFornecedor>)grupo.ToList());

        var categorias = considerados
            .GroupBy(item => item.Fornecedor.Categoria)
            .OrderBy(grupo => grupo.Key)
            .Select(grupo =>
            {
                var totais = grupo
                    .Select(item => TotaisVinculo(item.Vinculo, ParcelasDo(parcelasPorVinculo, item.Vinculo.Id), hoje))
                    .ToList();

                return new ResumoCategoriaOrcamentoDto(
                    grupo.Key.ToString(),
                    grupo.Count(),
                    grupo.Count(item => item.Vinculo.Status == StatusFornecedorEvento.Contratado),
                    grupo.Sum(item => item.Vinculo.ValorOrcado ?? 0m),
                    totais.Sum(total => total.Contratado),
                    totais.Sum(total => total.Pago),
                    totais.Sum(total => total.Pendente),
                    totais.Sum(total => total.Vencido),
                    totais.Sum(total => total.Parcelado));
            })
            .ToList();

        return new ResumoOrcamentoDto(
            categorias,
            categorias.Sum(categoria => categoria.Orcado),
            categorias.Sum(categoria => categoria.Contratado),
            considerados.Count,
            categorias.Sum(categoria => categoria.Contratados),
            categorias.Sum(categoria => categoria.Pago),
            categorias.Sum(categoria => categoria.Pendente),
            categorias.Sum(categoria => categoria.Vencido),
            categorias.Sum(categoria => categoria.Parcelado));
    }

    public static decimal ValorContratadoConsiderado(FornecedorEvento vinculo)
    {
        ArgumentNullException.ThrowIfNull(vinculo);
        return vinculo.Status == StatusFornecedorEvento.Contratado ? vinculo.ValorContratado ?? 0m : 0m;
    }

    public static TotaisFinanceirosVinculo TotaisVinculo(
        FornecedorEvento vinculo,
        IReadOnlyCollection<ParcelaFornecedor> parcelasDoVinculo,
        DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(vinculo);
        ArgumentNullException.ThrowIfNull(parcelasDoVinculo);

        var contratado = ValorContratadoConsiderado(vinculo);

        if (vinculo.Status != StatusFornecedorEvento.Contratado)
        {
            return new TotaisFinanceirosVinculo(contratado, 0m, 0m, 0m, 0m);
        }

        var parcelado = parcelasDoVinculo.Sum(parcela => parcela.Valor);
        var pago = parcelasDoVinculo.Where(parcela => parcela.Paga).Sum(parcela => parcela.Valor);
        var vencido = parcelasDoVinculo
            .Where(parcela => parcela.Situacao(hoje) == SituacaoParcela.Vencida)
            .Sum(parcela => parcela.Valor);

        return new TotaisFinanceirosVinculo(contratado, parcelado, pago, Math.Max(contratado - pago, 0m), vencido);
    }

    public static ResumoParcelasVinculoDto? ResumoParcelas(
        FornecedorEvento vinculo,
        IReadOnlyCollection<ParcelaFornecedor> parcelasDoVinculo,
        DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(vinculo);
        ArgumentNullException.ThrowIfNull(parcelasDoVinculo);

        if (parcelasDoVinculo.Count == 0)
        {
            return null;
        }

        var parcelado = parcelasDoVinculo.Sum(parcela => parcela.Valor);
        var proxima = parcelasDoVinculo
            .Where(parcela => !parcela.Paga)
            .OrderBy(parcela => parcela.Vencimento)
            .ThenBy(parcela => parcela.CriadoEm)
            .ThenBy(parcela => parcela.Id)
            .FirstOrDefault();

        return new ResumoParcelasVinculoDto(
            parcelasDoVinculo.Count,
            parcelasDoVinculo.Count(parcela => parcela.Paga),
            parcelasDoVinculo.Count(parcela => parcela.Situacao(hoje) == SituacaoParcela.Vencida),
            parcelado,
            parcelasDoVinculo.Where(parcela => parcela.Paga).Sum(parcela => parcela.Valor),
            RegrasSomaParcelas.SaldoAParcelar(vinculo.ValorContratado ?? 0m, parcelado),
            proxima?.Vencimento,
            proxima?.Valor);
    }

    private static IReadOnlyList<ParcelaFornecedor> ParcelasDo(
        IReadOnlyDictionary<Guid, IReadOnlyList<ParcelaFornecedor>> parcelasPorVinculo,
        Guid vinculoId)
    {
        return parcelasPorVinculo.TryGetValue(vinculoId, out var lista) ? lista : [];
    }
}
