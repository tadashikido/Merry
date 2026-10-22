using Celebri.Aplicacao.DadosSensiveis;

namespace Celebri.Aplicacao.Persistencia;

public interface IDadosSensiveisRepository
{
    Task<IReadOnlyList<RegistroDadosSensiveis>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<int> ContarPessoasComRestricaoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<int> AnonimizarVencidosAsync(DateOnly dataEventoAnteriorA, DateTimeOffset agora, CancellationToken cancelamento);
}
