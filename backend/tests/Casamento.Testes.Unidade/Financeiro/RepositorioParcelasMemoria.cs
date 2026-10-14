using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Financeiro;
using Casamento.Dominio.Fornecedores;
using Casamento.Testes.Unidade.Fornecedores;

namespace Casamento.Testes.Unidade.Financeiro;

public sealed class RepositorioParcelasMemoria : IParcelaFornecedorRepository
{
    private readonly RepositorioVinculosFornecedorMemoria _vinculos;

    public RepositorioParcelasMemoria(RepositorioVinculosFornecedorMemoria vinculos)
    {
        _vinculos = vinculos;
    }

    public List<ParcelaFornecedor> Itens { get; } = [];

    public Dictionary<Guid, CasamentoAssessorado> Casamentos { get; } = [];

    public Task<IReadOnlyList<ParcelaFornecedor>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        IReadOnlyList<ParcelaFornecedor> resultado = Itens.Where(parcela => parcela.CasamentoId == casamentoId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        IReadOnlyList<ParcelaFornecedor> resultado = Itens
            .Where(parcela => parcela.CasamentoId == casamentoId && parcela.FornecedorCasamentoId == vinculoId)
            .ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculosAsync(IReadOnlyCollection<Guid> vinculoIds, CancellationToken cancelamento)
    {
        IReadOnlyList<ParcelaFornecedor> resultado = Itens.Where(parcela => vinculoIds.Contains(parcela.FornecedorCasamentoId)).ToList();
        return Task.FromResult(resultado);
    }

    public Task<ParcelaFornecedor?> ObterAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.FirstOrDefault(parcela =>
            parcela.CasamentoId == casamentoId && parcela.FornecedorCasamentoId == vinculoId && parcela.Id == parcelaId));
    }

    public Task<TotaisParcelasVinculo> ObterTotaisPorVinculoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var doVinculo = Itens.Where(parcela => parcela.CasamentoId == casamentoId && parcela.FornecedorCasamentoId == vinculoId).ToList();
        return Task.FromResult(new TotaisParcelasVinculo(doVinculo.Count, doVinculo.Sum(parcela => parcela.Valor)));
    }

    public Task<AlertasParcelas> ListarAlertasAsync(Guid? casamentoId, DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento)
    {
        var limite = hoje.AddDays(ParcelaFornecedor.JanelaAlertaDias);
        var pendentes = Itens
            .Where(parcela => parcela.Status == StatusParcela.Pendente && parcela.Vencimento <= limite)
            .Where(parcela => casamentoId is null || parcela.CasamentoId == casamentoId)
            .Select(parcela => new
            {
                Parcela = parcela,
                Vinculo = _vinculos.Itens.First(vinculo => vinculo.Id == parcela.FornecedorCasamentoId),
                Casamento = Casamentos[parcela.CasamentoId],
            })
            .Where(item => item.Vinculo.Status == StatusFornecedorCasamento.Contratado && !item.Casamento.Arquivado)
            .OrderBy(item => item.Parcela.Vencimento)
            .ThenBy(item => item.Parcela.CriadoEm)
            .ThenBy(item => item.Parcela.Id)
            .Select(item => new ParcelaAlerta(
                item.Parcela,
                item.Casamento.NomePrimeiraPessoa,
                item.Casamento.NomeSegundaPessoa,
                _vinculos.Fornecedores[item.Vinculo.FornecedorId].NomeEmpresa))
            .ToList();

        var vencidas = pendentes.Where(item => item.Parcela.Vencimento < hoje).ToList();
        var proximas = pendentes.Where(item => item.Parcela.Vencimento >= hoje).ToList();

        return Task.FromResult(new AlertasParcelas(
            vencidas.Count,
            vencidas.Sum(item => item.Parcela.Valor),
            proximas.Count,
            proximas.Sum(item => item.Parcela.Valor),
            vencidas.Select(item => item.Parcela.CasamentoId).Distinct().Count(),
            vencidas.Take(limitePorGrupo).ToList(),
            proximas.Take(limitePorGrupo).ToList()));
    }

    public void Adicionar(ParcelaFornecedor parcela)
    {
        Itens.Add(parcela);
    }

    public void Remover(ParcelaFornecedor parcela)
    {
        Itens.Remove(parcela);
    }
}
