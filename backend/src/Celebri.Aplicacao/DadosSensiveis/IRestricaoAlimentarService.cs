namespace Celebri.Aplicacao.DadosSensiveis;

public interface IRestricaoAlimentarService
{
    Task<RelatorioRestricoesAlimentaresDto> ObterRelatorioAsync(Guid eventoId, CancellationToken cancelamento);

    Task<RestricaoAlimentarDto> SalvarAsync(
        Guid eventoId,
        Guid conviteId,
        Guid convidadoId,
        SalvarRestricaoAlimentarRequest request,
        CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid conviteId, Guid convidadoId, CancellationToken cancelamento);
}
