using Casamento.Dominio.Convidados;
using Casamento.Dominio.Mesas;

namespace Casamento.Aplicacao.Persistencia;

public interface IMesaRepository
{
    Task<IReadOnlyList<Mesa>> ListarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<Mesa?> ObterAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento);

    Task<int> ContarAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<bool> ExisteNumeroAsync(Guid casamentoId, int numero, Guid? excetoMesaId, CancellationToken cancelamento);

    Task<bool> ExisteEspecialAsync(Guid casamentoId, Guid? excetoMesaId, CancellationToken cancelamento);

    Task<int> ContarOcupacaoAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento);

    Task<IReadOnlyList<Convidado>> ObterConvidadosAsync(Guid casamentoId, IReadOnlyCollection<Guid> convidadosIds, CancellationToken cancelamento);

    void Adicionar(Mesa mesa);

    void Remover(Mesa mesa);
}
