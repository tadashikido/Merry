using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Persistencia;
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
}
