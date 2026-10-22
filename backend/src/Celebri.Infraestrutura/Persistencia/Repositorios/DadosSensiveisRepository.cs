using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class DadosSensiveisRepository : IDadosSensiveisRepository
{
    private readonly CasamentoDbContext _contexto;

    public DadosSensiveisRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<RegistroDadosSensiveis>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.DadosSensiveisConvidados
            .AsNoTracking()
            .Where(dados => dados.CasamentoId == casamentoId)
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

    public Task<int> ContarPessoasComRestricaoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return _contexto.DadosSensiveisConvidados
            .Where(dados => dados.CasamentoId == casamentoId && dados.ConteudoCifrado != null)
            .Join(
                _contexto.Convidados,
                dados => dados.ConvidadoId,
                convidado => convidado.Id,
                (dados, convidado) => convidado.Resposta)
            .CountAsync(resposta => resposta != RespostaRsvp.Recusado, cancelamento);
    }

    public Task<int> AnonimizarVencidosAsync(DateOnly dataCasamentoAnteriorA, DateTimeOffset agora, CancellationToken cancelamento)
    {
        return _contexto.DadosSensiveisConvidados
            .Where(dados => dados.ConteudoCifrado != null)
            .Where(dados => _contexto.Casamentos.Any(casamento => casamento.Id == dados.CasamentoId && casamento.Data < dataCasamentoAnteriorA))
            .ExecuteUpdateAsync(
                atualizacao => atualizacao
                    .SetProperty(dados => dados.ConteudoCifrado, (string?)null)
                    .SetProperty(dados => dados.ExcluidoEm, (DateTimeOffset?)agora),
                cancelamento);
    }
}
