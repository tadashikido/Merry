using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Recifragem;
using Celebri.Dominio.Cronogramas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class AcessoCronogramaRepository : IAcessoCronogramaRepository
{
    private readonly CelebriDbContext _contexto;

    public AcessoCronogramaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return _contexto.AcessosCronograma.AsNoTracking().FirstOrDefaultAsync(acesso => acesso.TokenHash == tokenHash, cancelamento);
    }

    public async Task<IReadOnlyList<AcessoCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.AcessosCronograma
            .AsNoTracking()
            .Where(acesso => acesso.EventoId == eventoId)
            .ToListAsync(cancelamento);
    }

    public Task<AcessoCronograma?> ObterAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        return _contexto.AcessosCronograma
            .FirstOrDefaultAsync(acesso => acesso.EventoId == eventoId && acesso.Id == acessoId, cancelamento);
    }

    public void Adicionar(AcessoCronograma acesso)
    {
        _contexto.AcessosCronograma.Add(acesso);
    }

    public void Remover(AcessoCronograma acesso)
    {
        _contexto.AcessosCronograma.Remove(acesso);
    }

    public async Task<IReadOnlyList<CifraArmazenada>> ListarCifrasAsync(Guid? aposAcessoId, int quantidade, CancellationToken cancelamento)
    {
        var consulta = DaOrganizacaoAtual().AsNoTracking();

        if (aposAcessoId is { } ultimo)
        {
            consulta = consulta.Where(acesso => acesso.Id.CompareTo(ultimo) > 0);
        }

        return await consulta
            .OrderBy(acesso => acesso.Id)
            .Take(quantidade)
            .Select(acesso => new CifraArmazenada(acesso.Id, acesso.EventoId, acesso.TokenCifrado))
            .ToListAsync(cancelamento);
    }

    public async Task<int> SubstituirCifrasAsync(IReadOnlyList<SubstituicaoCifra> substituicoes, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(substituicoes);

        await using var transacao = await _contexto.Database.BeginTransactionAsync(cancelamento);
        var total = 0;

        foreach (var substituicao in substituicoes)
        {
            total += await DaOrganizacaoAtual()
                .Where(acesso => acesso.Id == substituicao.Id && acesso.TokenCifrado == substituicao.Anterior)
                .ExecuteUpdateAsync(atualizacao => atualizacao.SetProperty(acesso => acesso.TokenCifrado, substituicao.Nova), cancelamento);
        }

        await transacao.CommitAsync(cancelamento);
        return total;
    }

    private IQueryable<AcessoCronograma> DaOrganizacaoAtual()
    {
        var organizacaoId = _contexto.OrganizacaoIdAtual;

        return organizacaoId is { } atual
            ? _contexto.AcessosCronograma.Where(acesso => acesso.OrganizacaoId == atual)
            : _contexto.AcessosCronograma.Where(acesso => false);
    }
}
