using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Unidade.Fornecedores;

namespace Celebri.Testes.Unidade.Financeiro;

public sealed class RepositorioParcelasMemoria : IParcelaFornecedorRepository
{
    private readonly RepositorioVinculosFornecedorMemoria _vinculos;

    public RepositorioParcelasMemoria(RepositorioVinculosFornecedorMemoria vinculos)
    {
        _vinculos = vinculos;
    }

    public List<ParcelaFornecedor> Itens { get; } = [];

    public Dictionary<Guid, Evento> Eventos { get; } = [];

    public Task<IReadOnlyList<ParcelaFornecedor>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        IReadOnlyList<ParcelaFornecedor> resultado = Itens.Where(parcela => parcela.EventoId == eventoId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        IReadOnlyList<ParcelaFornecedor> resultado = Itens
            .Where(parcela => parcela.EventoId == eventoId && parcela.FornecedorEventoId == vinculoId)
            .ToList();
        return Task.FromResult(resultado);
    }

    public Task<IReadOnlyList<ParcelaFornecedor>> ListarPorVinculosAsync(IReadOnlyCollection<Guid> vinculoIds, CancellationToken cancelamento)
    {
        IReadOnlyList<ParcelaFornecedor> resultado = Itens.Where(parcela => vinculoIds.Contains(parcela.FornecedorEventoId)).ToList();
        return Task.FromResult(resultado);
    }

    public Task<ParcelaFornecedor?> ObterAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.FirstOrDefault(parcela =>
            parcela.EventoId == eventoId && parcela.FornecedorEventoId == vinculoId && parcela.Id == parcelaId));
    }

    public Task<TotaisParcelasVinculo> ObterTotaisPorVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var doVinculo = Itens.Where(parcela => parcela.EventoId == eventoId && parcela.FornecedorEventoId == vinculoId).ToList();
        return Task.FromResult(new TotaisParcelasVinculo(doVinculo.Count, doVinculo.Sum(parcela => parcela.Valor)));
    }

    public Task<AlertasParcelas> ListarAlertasAsync(Guid? eventoId, DateOnly hoje, int limitePorGrupo, CancellationToken cancelamento)
    {
        var limite = hoje.AddDays(ParcelaFornecedor.JanelaAlertaDias);
        var pendentes = Itens
            .Where(parcela => parcela.Status == StatusParcela.Pendente && parcela.Vencimento <= limite)
            .Where(parcela => eventoId is null || parcela.EventoId == eventoId)
            .Select(parcela => new
            {
                Parcela = parcela,
                Vinculo = _vinculos.Itens.First(vinculo => vinculo.Id == parcela.FornecedorEventoId),
                Evento = Eventos[parcela.EventoId],
            })
            .Where(item => item.Vinculo.Status == StatusFornecedorEvento.Contratado && !item.Evento.Arquivado)
            .OrderBy(item => item.Parcela.Vencimento)
            .ThenBy(item => item.Parcela.CriadoEm)
            .ThenBy(item => item.Parcela.Id)
            .Select(item => new ParcelaAlerta(
                item.Parcela,
                item.Evento.NomePrimeiraPessoa,
                item.Evento.NomeSegundaPessoa,
                _vinculos.Fornecedores[item.Vinculo.FornecedorId].NomeEmpresa))
            .ToList();

        var vencidas = pendentes.Where(item => item.Parcela.Vencimento < hoje).ToList();
        var proximas = pendentes.Where(item => item.Parcela.Vencimento >= hoje).ToList();

        return Task.FromResult(new AlertasParcelas(
            vencidas.Count,
            vencidas.Sum(item => item.Parcela.Valor),
            proximas.Count,
            proximas.Sum(item => item.Parcela.Valor),
            vencidas.Select(item => item.Parcela.EventoId).Distinct().Count(),
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
