using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Mesas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class MesaRepository : IMesaRepository
{
    private readonly CelebriDbContext _contexto;

    public MesaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Mesa>> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _contexto.Mesas
            .AsNoTracking()
            .Where(mesa => mesa.EventoId == eventoId)
            .ToListAsync(cancelamento);
    }

    public Task<Mesa?> ObterAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.FirstOrDefaultAsync(mesa => mesa.Id == mesaId && mesa.EventoId == eventoId, cancelamento);
    }

    public Task<int> ContarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.CountAsync(mesa => mesa.EventoId == eventoId, cancelamento);
    }

    public Task<bool> ExisteNumeroAsync(Guid eventoId, int numero, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.AnyAsync(
            mesa => mesa.EventoId == eventoId && mesa.Numero == numero && mesa.Id != excetoMesaId,
            cancelamento);
    }

    public Task<bool> ExisteEspecialAsync(Guid eventoId, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.AnyAsync(
            mesa => mesa.EventoId == eventoId && mesa.Especial && mesa.Id != excetoMesaId,
            cancelamento);
    }

    public Task<int> ContarOcupacaoAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        return _contexto.Convidados.CountAsync(
            convidado => convidado.EventoId == eventoId && convidado.MesaId == mesaId,
            cancelamento);
    }

    public async Task<IReadOnlyList<Convidado>> ObterConvidadosAsync(
        Guid eventoId,
        IReadOnlyCollection<Guid> convidadosIds,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(convidadosIds);

        var identificadores = convidadosIds.ToArray();

        return await _contexto.Convidados
            .Where(convidado => convidado.EventoId == eventoId && identificadores.Contains(convidado.Id))
            .ToListAsync(cancelamento);
    }

    public void Adicionar(Mesa mesa)
    {
        _contexto.Mesas.Add(mesa);
    }

    public void Remover(Mesa mesa)
    {
        _contexto.Mesas.Remove(mesa);
    }
}
