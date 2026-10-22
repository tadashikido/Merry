using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Mesas;

namespace Casamento.Testes.Unidade.Mesas;

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

    public Task<IReadOnlyList<Mesa>> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        IReadOnlyList<Mesa> resultado = Itens.Where(mesa => mesa.CasamentoId == casamentoId).ToList();
        return Task.FromResult(resultado);
    }

    public Task<Mesa?> ObterAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.FirstOrDefault(mesa => mesa.CasamentoId == casamentoId && mesa.Id == mesaId));
    }

    public Task<int> ContarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Count(mesa => mesa.CasamentoId == casamentoId));
    }

    public Task<bool> ExisteNumeroAsync(Guid casamentoId, int numero, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Exists(mesa => mesa.CasamentoId == casamentoId && mesa.Numero == numero && mesa.Id != excetoMesaId));
    }

    public Task<bool> ExisteEspecialAsync(Guid casamentoId, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.Exists(mesa => mesa.CasamentoId == casamentoId && mesa.Especial && mesa.Id != excetoMesaId));
    }

    public Task<int> ContarOcupacaoAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        return Task.FromResult(_convidados().Count(convidado => convidado.CasamentoId == casamentoId && convidado.MesaId == mesaId));
    }

    public Task<IReadOnlyList<Convidado>> ObterConvidadosAsync(
        Guid casamentoId,
        IReadOnlyCollection<Guid> convidadosIds,
        CancellationToken cancelamento)
    {
        IReadOnlyList<Convidado> resultado = _convidados()
            .Where(convidado => convidado.CasamentoId == casamentoId && convidadosIds.Contains(convidado.Id))
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
