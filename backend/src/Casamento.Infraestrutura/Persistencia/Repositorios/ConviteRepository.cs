using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Convidados.Importacao;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Convidados;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class ConviteRepository : IConviteRepository
{
    private readonly CasamentoDbContext _contexto;

    public ConviteRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Convite>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.Convites
            .AsNoTracking()
            .Include(convite => convite.Convidados)
            .ThenInclude(convidado => convidado.DadosSensiveis)
            .Where(convite => convite.CasamentoId == casamentoId)
            .AsSplitQuery()
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.Convites
            .AsNoTracking()
            .Include(convite => convite.Convidados)
            .Where(convite => convite.CasamentoId == casamentoId)
            .AsSplitQuery()
            .ToListAsync(cancelamento);
    }

    public Task<Convite?> ObterPorIdAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return _contexto.Convites
            .Include(convite => convite.Convidados)
            .ThenInclude(convidado => convidado.DadosSensiveis)
            .FirstOrDefaultAsync(convite => convite.Id == conviteId && convite.CasamentoId == casamentoId, cancelamento);
    }

    public Task<int> ContarConvidadosAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return _contexto.Convidados.CountAsync(convidado => convidado.CasamentoId == casamentoId, cancelamento);
    }

    public async Task<ResumoConvidados> ObterResumoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var contagens = await _contexto.Convidados
            .Where(convidado => convidado.CasamentoId == casamentoId)
            .GroupBy(convidado => new { convidado.FaixaEtaria, convidado.Resposta })
            .Select(grupo => new { grupo.Key.FaixaEtaria, grupo.Key.Resposta, Quantidade = grupo.Count() })
            .ToListAsync(cancelamento);

        var convites = _contexto.Convites.Where(convite => convite.CasamentoId == casamentoId);
        var quantidadeConvites = await convites.CountAsync(cancelamento);
        var acompanhantes = await convites.SumAsync(
            convite => Math.Max(0, convite.LimiteAcompanhantes - convite.Convidados.Count(convidado => convidado.Acompanhante)),
            cancelamento);

        return new ResumoConvidados(
            contagens.Select(contagem => new ContagemConvidados(contagem.FaixaEtaria, contagem.Resposta, contagem.Quantidade)).ToList(),
            quantidadeConvites,
            acompanhantes);
    }

    public async Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.Convidados
            .AsNoTracking()
            .Where(convidado => convidado.CasamentoId == casamentoId)
            .Select(convidado => new IdentificacaoConvidado(convidado.Nome, convidado.Telefone))
            .ToListAsync(cancelamento);
    }

    public void Adicionar(Convite convite)
    {
        _contexto.Convites.Add(convite);
    }

    public void AdicionarVarios(IEnumerable<Convite> convites)
    {
        _contexto.Convites.AddRange(convites);
    }

    public void Remover(Convite convite)
    {
        _contexto.Convites.Remove(convite);
    }
}
