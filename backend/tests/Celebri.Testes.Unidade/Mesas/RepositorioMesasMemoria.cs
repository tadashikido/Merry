using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Mesas;

namespace Celebri.Testes.Unidade.Mesas;

public sealed class RepositorioMesasMemoria : IMesaRepository
{
    private readonly Func<IEnumerable<Convidado>> _convidados;

    public RepositorioMesasMemoria()
        : this(() => [])
    {
    }

    public RepositorioMesasMemoria(Func<IEnumerable<Convidado>> convidados)
    {
        _convidados = convidados;
    }

    public List<Mesa> Itens { get; } = [];

    public List<Mesa> Removidas { get; } = [];

    public Task<IReadOnlyList<Mesa>> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        IReadOnlyList<Mesa> resultado = Itens.Where(mesa => mesa.EventoId == eventoId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<Mesa?> ObterAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.FirstOrDefault(mesa => mesa.EventoId == eventoId && mesa.Id == mesaId));
    }

    public Task<int> ContarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Count(mesa => mesa.EventoId == eventoId));
    }

    public Task<bool> ExisteNumeroAsync(Guid eventoId, int numero, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Exists(mesa => mesa.EventoId == eventoId && mesa.Numero == numero && mesa.Id != excetoMesaId));
    }

    public Task<bool> ExisteEspecialAsync(Guid eventoId, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Exists(mesa => mesa.EventoId == eventoId && mesa.Especial && mesa.Id != excetoMesaId));
    }

    public Task<int> ContarOcupacaoAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(_convidados().Count(convidado => convidado.EventoId == eventoId && convidado.MesaId == mesaId));
    }

    public Task<IReadOnlyList<Convidado>> ObterConvidadosAsync(
        Guid eventoId,
        IReadOnlyCollection<Guid> convidadosIds,
        CancellationToken cancelamento)
    {
        IReadOnlyList<Convidado> resultado = _convidados()
            .Where(convidado => convidado.EventoId == eventoId && convidadosIds.Contains(convidado.Id))
            .ToList();
        return Task.FromResult(resultado);
    }

    public void Adicionar(Mesa mesa)
    {
        Itens.Add(mesa);
    }

    public void Remover(Mesa mesa)
    {
        Itens.Remove(mesa);
        Removidas.Add(mesa);
    }
}
