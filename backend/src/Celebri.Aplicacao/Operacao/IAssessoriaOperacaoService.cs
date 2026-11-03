namespace Celebri.Aplicacao.Operacao;

public interface IAssessoriaOperacaoService
{
    Task<IReadOnlyList<AssessoriaResumoDto>> ListarAsync(string? busca, SituacaoAssessoria? situacao, CancellationToken cancelamento);

    Task<DashboardOperacaoDto> ObterDashboardAsync(CancellationToken cancelamento);

    Task SuspenderAsync(Guid organizacaoId, CancellationToken cancelamento);

    Task ReativarAsync(Guid organizacaoId, CancellationToken cancelamento);
}
