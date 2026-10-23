using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Recifragem;

namespace Celebri.Aplicacao.Persistencia;

public interface IDadosSensiveisRepository
{
    Task<IReadOnlyList<RegistroDadosSensiveis>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<int> ContarPessoasComRestricaoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<int> AnonimizarVencidosAsync(DateOnly dataEventoAnteriorA, DateTimeOffset agora, CancellationToken cancelamento);

    Task<IReadOnlyList<CifraArmazenada>> ListarCifrasAsync(Guid? aposConvidadoId, int quantidade, CancellationToken cancelamento);

    Task<int> SubstituirCifrasAsync(IReadOnlyList<SubstituicaoCifra> substituicoes, CancellationToken cancelamento);
}
