using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Financeiro;
using Casamento.Dominio.Fornecedores;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class ParcelaFornecedorRepository : IParcelaFornecedorRepository
{
    private readonly CasamentoDbContext _contexto;

    public ParcelaFornecedorRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<ParcelaFornecedor>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.ParcelasFornecedor
            .AsNoTracking()
            .Where(parcela => parcela.CasamentoId == casamentoId)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculoAsync(
        Guid casamentoId,
        Guid vinculoId,
        CancellationToken cancelamento)
    {
        return await _contexto.ParcelasFornecedor
            .Where(parcela => parcela.CasamentoId == casamentoId && parcela.FornecedorCasamentoId == vinculoId)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculosAsync(
        IReadOnlyCollection<Guid> vinculoIds,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(vinculoIds);

        var ids = vinculoIds.ToArray();

        return await _contexto.ParcelasFornecedor
            .AsNoTracking()
            .Where(parcela => ids.Contains(parcela.FornecedorCasamentoId))
            .ToListAsync(cancelamento);
    }

    public Task<ParcelaFornecedor?> ObterAsync(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        return _contexto.ParcelasFornecedor.FirstOrDefaultAsync(
            parcela => parcela.CasamentoId == casamentoId
                && parcela.FornecedorCasamentoId == vinculoId
                && parcela.Id == parcelaId,
            cancelamento);
    }

    public async Task<TotaisParcelasVinculo> ObterTotaisPorVinculoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var consulta = _contexto.ParcelasFornecedor
            .Where(parcela => parcela.CasamentoId == casamentoId && parcela.FornecedorCasamentoId == vinculoId);

        var quantidade = await consulta.CountAsync(cancelamento);
        var soma = quantidade == 0 ? 0m : await consulta.SumAsync(parcela => parcela.Valor, cancelamento);

        return new TotaisParcelasVinculo(quantidade, soma);
    }

    public async Task<AlertasParcelas> ListarAlertasAsync(
        Guid? casamentoId,
        DateOnly hoje,
        int limitePorGrupo,
        CancellationToken cancelamento)
    {
        var limiteJanela = hoje.AddDays(ParcelaFornecedor.JanelaAlertaDias);

        var pendentes =
            from parcela in _contexto.ParcelasFornecedor
            join vinculo in _contexto.FornecedoresCasamento on parcela.FornecedorCasamentoId equals vinculo.Id
            join casamento in _contexto.Casamentos on parcela.CasamentoId equals casamento.Id
            join fornecedor in _contexto.Fornecedores on vinculo.FornecedorId equals fornecedor.Id
            where parcela.Status == StatusParcela.Pendente
                && parcela.Vencimento <= limiteJanela
                && vinculo.Status == StatusFornecedorCasamento.Contratado
                && casamento.ArquivadoEm == null
            select new { Parcela = parcela, Casamento = casamento, Fornecedor = fornecedor };

        if (casamentoId is { } id)
        {
            pendentes = pendentes.Where(item => item.Parcela.CasamentoId == id);
        }

        var vencidas = pendentes.Where(item => item.Parcela.Vencimento < hoje);
        var proximas = pendentes.Where(item => item.Parcela.Vencimento >= hoje);

        var totalVencidas = await vencidas.CountAsync(cancelamento);
        var valorVencidas = totalVencidas == 0 ? 0m : await vencidas.SumAsync(item => item.Parcela.Valor, cancelamento);
        var totalProximas = await proximas.CountAsync(cancelamento);
        var valorProximas = totalProximas == 0 ? 0m : await proximas.SumAsync(item => item.Parcela.Valor, cancelamento);
        var casamentosComVencidas = totalVencidas == 0
            ? 0
            : await vencidas.Select(item => item.Parcela.CasamentoId).Distinct().CountAsync(cancelamento);

        var itensVencidos = totalVencidas == 0
            ? []
            : await vencidas
                .AsNoTracking()
                .OrderBy(item => item.Parcela.Vencimento)
                .ThenBy(item => item.Parcela.CriadoEm)
                .ThenBy(item => item.Parcela.Id)
                .Take(limitePorGrupo)
                .Select(item => new ParcelaAlerta(
                    item.Parcela,
                    item.Casamento.NomePrimeiraPessoa,
                    item.Casamento.NomeSegundaPessoa,
                    item.Fornecedor.NomeEmpresa))
                .ToListAsync(cancelamento);

        var itensProximos = totalProximas == 0
            ? []
            : await proximas
                .AsNoTracking()
                .OrderBy(item => item.Parcela.Vencimento)
                .ThenBy(item => item.Parcela.CriadoEm)
                .ThenBy(item => item.Parcela.Id)
                .Take(limitePorGrupo)
                .Select(item => new ParcelaAlerta(
                    item.Parcela,
                    item.Casamento.NomePrimeiraPessoa,
                    item.Casamento.NomeSegundaPessoa,
                    item.Fornecedor.NomeEmpresa))
                .ToListAsync(cancelamento);

        return new AlertasParcelas(
            totalVencidas,
            valorVencidas,
            totalProximas,
            valorProximas,
            casamentosComVencidas,
            itensVencidos,
            itensProximos);
    }

    public void Adicionar(ParcelaFornecedor parcela)
    {
        _contexto.ParcelasFornecedor.Add(parcela);
    }

    public void Remover(ParcelaFornecedor parcela)
    {
        _contexto.ParcelasFornecedor.Remove(parcela);
    }
}
