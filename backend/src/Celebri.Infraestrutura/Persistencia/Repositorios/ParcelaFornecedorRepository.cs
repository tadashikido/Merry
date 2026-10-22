using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ParcelaFornecedorRepository : IParcelaFornecedorRepository
{
    private readonly CelebriDbContext _contexto;

    public ParcelaFornecedorRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<ParcelaFornecedor>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.ParcelasFornecedor
            .AsNoTracking()
            .Where(parcela => parcela.EventoId == eventoId)
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculoAsync(
        Guid eventoId,
        Guid vinculoId,
        CancellationToken cancelamento)
    {
        return await _contexto.ParcelasFornecedor
            .Where(parcela => parcela.EventoId == eventoId && parcela.FornecedorEventoId == vinculoId)
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
            .Where(parcela => ids.Contains(parcela.FornecedorEventoId))
            .ToListAsync(cancelamento);
    }

    public Task<ParcelaFornecedor?> ObterAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        return _contexto.ParcelasFornecedor.FirstOrDefaultAsync(
            parcela => parcela.EventoId == eventoId
                && parcela.FornecedorEventoId == vinculoId
                && parcela.Id == parcelaId,
            cancelamento);
    }

    public async Task<TotaisParcelasVinculo> ObterTotaisPorVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var consulta = _contexto.ParcelasFornecedor
            .Where(parcela => parcela.EventoId == eventoId && parcela.FornecedorEventoId == vinculoId);

        var quantidade = await consulta.CountAsync(cancelamento);
        var soma = quantidade == 0 ? 0m : await consulta.SumAsync(parcela => parcela.Valor, cancelamento);

        return new TotaisParcelasVinculo(quantidade, soma);
    }

    public async Task<AlertasParcelas> ListarAlertasAsync(
        Guid? eventoId,
        DateOnly hoje,
        int limitePorGrupo,
        CancellationToken cancelamento)
    {
        var limiteJanela = hoje.AddDays(ParcelaFornecedor.JanelaAlertaDias);

        var pendentes =
            from parcela in _contexto.ParcelasFornecedor
            join vinculo in _contexto.FornecedoresEvento on parcela.FornecedorEventoId equals vinculo.Id
            join evento in _contexto.Eventos on parcela.EventoId equals evento.Id
            join fornecedor in _contexto.Fornecedores on vinculo.FornecedorId equals fornecedor.Id
            where parcela.Status == StatusParcela.Pendente
                && parcela.Vencimento <= limiteJanela
                && vinculo.Status == StatusFornecedorEvento.Contratado
                && evento.ArquivadoEm == null
            select new { Parcela = parcela, Evento = evento, Fornecedor = fornecedor };

        if (eventoId is { } id)
        {
            pendentes = pendentes.Where(item => item.Parcela.EventoId == id);
        }

        var vencidas = pendentes.Where(item => item.Parcela.Vencimento < hoje);
        var proximas = pendentes.Where(item => item.Parcela.Vencimento >= hoje);

        var totalVencidas = await vencidas.CountAsync(cancelamento);
        var valorVencidas = totalVencidas == 0 ? 0m : await vencidas.SumAsync(item => item.Parcela.Valor, cancelamento);
        var totalProximas = await proximas.CountAsync(cancelamento);
        var valorProximas = totalProximas == 0 ? 0m : await proximas.SumAsync(item => item.Parcela.Valor, cancelamento);
        var eventosComVencidas = totalVencidas == 0
            ? 0
            : await vencidas.Select(item => item.Parcela.EventoId).Distinct().CountAsync(cancelamento);

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
                    item.Evento.NomePrimeiraPessoa,
                    item.Evento.NomeSegundaPessoa,
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
                    item.Evento.NomePrimeiraPessoa,
                    item.Evento.NomeSegundaPessoa,
                    item.Fornecedor.NomeEmpresa))
                .ToListAsync(cancelamento);

        return new AlertasParcelas(
            totalVencidas,
            valorVencidas,
            totalProximas,
            valorProximas,
            eventosComVencidas,
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
