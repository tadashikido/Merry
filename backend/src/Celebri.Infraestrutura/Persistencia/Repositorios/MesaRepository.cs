using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Mesas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class MesaRepository : IMesaRepository
{
    private readonly CasamentoDbContext _contexto;

    public MesaRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<Mesa>> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _contexto.Mesas
            .AsNoTracking()
            .Where(mesa => mesa.CasamentoId == casamentoId)
            .ToListAsync(cancelamento);
    }

    public Task<Mesa?> ObterAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.FirstOrDefaultAsync(mesa => mesa.Id == mesaId && mesa.CasamentoId == casamentoId, cancelamento);
    }

    public Task<int> ContarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.CountAsync(mesa => mesa.CasamentoId == casamentoId, cancelamento);
    }

    public Task<bool> ExisteNumeroAsync(Guid casamentoId, int numero, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.AnyAsync(
            mesa => mesa.CasamentoId == casamentoId && mesa.Numero == numero && mesa.Id != excetoMesaId,
            cancelamento);
    }

    public Task<bool> ExisteEspecialAsync(Guid casamentoId, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return _contexto.Mesas.AnyAsync(
            mesa => mesa.CasamentoId == casamentoId && mesa.Especial && mesa.Id != excetoMesaId,
            cancelamento);
    }

    public Task<int> ContarOcupacaoAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        return _contexto.Convidados.CountAsync(
            convidado => convidado.CasamentoId == casamentoId && convidado.MesaId == mesaId,
            cancelamento);
    }

    public async Task<IReadOnlyList<Convidado>> ObterConvidadosAsync(
        Guid casamentoId,
        IReadOnlyCollection<Guid> convidadosIds,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(convidadosIds);

        var identificadores = convidadosIds.ToArray();

        return await _contexto.Convidados
            .Where(convidado => convidado.CasamentoId == casamentoId && identificadores.Contains(convidado.Id))
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
