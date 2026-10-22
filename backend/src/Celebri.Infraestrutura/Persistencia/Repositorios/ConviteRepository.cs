using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class ConviteRepository : IConviteRepository
{
    private readonly CelebriDbContext _contexto;

    public ConviteRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Convite>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.Convites
            .AsNoTracking()
            .Include(convite => convite.Convidados)
            .ThenInclude(convidado => convidado.DadosSensiveis)
            .Where(convite => convite.EventoId == eventoId)
            .AsSplitQuery()
            .ToListAsync(cancelamento);
    }

    public async Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.Convites
            .AsNoTracking()
            .Include(convite => convite.Convidados)
            .Where(convite => convite.EventoId == eventoId)
            .AsSplitQuery()
            .ToListAsync(cancelamento);
    }

    public Task<Convite?> ObterPorIdAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return _contexto.Convites
            .Include(convite => convite.Convidados)
            .ThenInclude(convidado => convidado.DadosSensiveis)
            .FirstOrDefaultAsync(convite => convite.Id == conviteId && convite.EventoId == eventoId, cancelamento);
    }

    public Task<int> ContarConvidadosAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return _contexto.Convidados.CountAsync(convidado => convidado.EventoId == eventoId, cancelamento);
    }

    public async Task<ResumoConvidados> ObterResumoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var contagens = await _contexto.Convidados
            .Where(convidado => convidado.EventoId == eventoId)
            .GroupBy(convidado => new { convidado.FaixaEtaria, convidado.Resposta })
            .Select(grupo => new { grupo.Key.FaixaEtaria, grupo.Key.Resposta, Quantidade = grupo.Count() })
            .ToListAsync(cancelamento);

        var convites = _contexto.Convites.Where(convite => convite.EventoId == eventoId);
        var quantidadeConvites = await convites.CountAsync(cancelamento);
        var acompanhantes = await convites.SumAsync(
            convite => Math.Max(0, convite.LimiteAcompanhantes - convite.Convidados.Count(convidado => convidado.Acompanhante)),
            cancelamento);

        return new ResumoConvidados(
            contagens.Select(contagem => new ContagemConvidados(contagem.FaixaEtaria, contagem.Resposta, contagem.Quantidade)).ToList(),
            quantidadeConvites,
            acompanhantes);
    }

    public async Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var convites = _contexto.Convites.Where(convite => convite.EventoId == eventoId);
        var possuiConvites = await convites.AnyAsync(cancelamento);
        if (!possuiConvites)
        {
            return ResumoEnvioConvites.Vazio;
        }

        var possuiEnviados = await convites.AnyAsync(convite => convite.StatusEnvio != StatusEnvioConvite.NaoEnviado, cancelamento);
        return new ResumoEnvioConvites(true, possuiEnviados);
    }

    public async Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.Convidados
            .AsNoTracking()
            .Where(convidado => convidado.EventoId == eventoId)
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
