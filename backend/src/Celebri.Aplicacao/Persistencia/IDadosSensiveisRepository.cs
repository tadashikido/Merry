using Casamento.Aplicacao.DadosSensiveis;

namespace Casamento.Aplicacao.Persistencia;

public interface IDadosSensiveisRepository
{
    Task<IReadOnlyList<RegistroDadosSensiveis>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<int> ContarPessoasComRestricaoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<int> AnonimizarVencidosAsync(DateOnly dataCasamentoAnteriorA, DateTimeOffset agora, CancellationToken cancelamento);
}
