namespace Casamento.Aplicacao.DadosSensiveis;

public interface IRestricaoAlimentarService
{
    Task<RelatorioRestricoesAlimentaresDto> ObterRelatorioAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<RestricaoAlimentarDto> SalvarAsync(
        Guid casamentoId,
        Guid conviteId,
        Guid convidadoId,
        SalvarRestricaoAlimentarRequest request,
        CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid conviteId, Guid convidadoId, CancellationToken cancelamento);
}
