using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Recifragem;
using Celebri.Dominio.Convidados;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class DadosSensiveisRepository : IDadosSensiveisRepository
{
    private readonly CelebriDbContext _contexto;

    public DadosSensiveisRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<RegistroDadosSensiveis>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.DadosSensiveisConvidados
            .AsNoTracking()
            .Where(dados => dados.EventoId == eventoId)
            .Join(
                _contexto.Convidados,
                dados => dados.ConvidadoId,
                convidado => convidado.Id,
                (dados, convidado) => new RegistroDadosSensiveis(
                    convidado.Id,
                    convidado.ConviteId,
                    convidado.Nome,
                    convidado.Acompanhante,
                    convidado.Resposta,
                    dados.ConteudoCifrado,
                    dados.OrigemConsentimento,
                    dados.ConsentidoEm,
                    dados.ExcluidoEm))
            .ToListAsync(cancelamento);
    }

    public Task<int> ContarPessoasComRestricaoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return _contexto.DadosSensiveisConvidados
            .Where(dados => dados.EventoId == eventoId && dados.ConteudoCifrado != null)
            .Join(
                _contexto.Convidados,
                dados => dados.ConvidadoId,
                convidado => convidado.Id,
                (dados, convidado) => convidado.Resposta)
            .CountAsync(resposta => resposta != RespostaRsvp.Recusado, cancelamento);
    }

    public Task<int> AnonimizarVencidosAsync(DateOnly dataEventoAnteriorA, DateTimeOffset agora, CancellationToken cancelamento)
    {
        return _contexto.DadosSensiveisConvidados
            .Where(dados => dados.ConteudoCifrado != null)
            .Where(dados => _contexto.Eventos.Any(evento => evento.Id == dados.EventoId && evento.Data < dataEventoAnteriorA))
            .ExecuteUpdateAsync(
                atualizacao => atualizacao
                    .SetProperty(dados => dados.ConteudoCifrado, (string?)null)
                    .SetProperty(dados => dados.ExcluidoEm, (DateTimeOffset?)agora),
                cancelamento);
    }

    public async Task<IReadOnlyList<CifraArmazenada>> ListarCifrasAsync(Guid? aposConvidadoId, int quantidade, CancellationToken cancelamento)
    {
        var consulta = _contexto.DadosSensiveisConvidados
            .AsNoTracking()
            .Where(dados => dados.ConteudoCifrado != null);

        if (aposConvidadoId is { } ultimo)
        {
            consulta = consulta.Where(dados => dados.ConvidadoId.CompareTo(ultimo) > 0);
        }

        return await consulta
            .OrderBy(dados => dados.ConvidadoId)
            .Take(quantidade)
            .Select(dados => new CifraArmazenada(dados.ConvidadoId, dados.ConvidadoId, dados.ConteudoCifrado!))
            .ToListAsync(cancelamento);
    }

    public async Task<int> SubstituirCifrasAsync(IReadOnlyList<SubstituicaoCifra> substituicoes, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(substituicoes);

        await using var transacao = await _contexto.Database.BeginTransactionAsync(cancelamento);
        var total = 0;

        foreach (var substituicao in substituicoes)
        {
            total += await _contexto.DadosSensiveisConvidados
                .Where(dados => dados.ConvidadoId == substituicao.Id && dados.ConteudoCifrado == substituicao.Anterior)
                .ExecuteUpdateAsync(atualizacao => atualizacao.SetProperty(dados => dados.ConteudoCifrado, substituicao.Nova), cancelamento);
        }

        await transacao.CommitAsync(cancelamento);
        return total;
    }
}
