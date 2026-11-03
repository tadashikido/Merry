using Celebri.Aplicacao.Operacao;

namespace Celebri.Aplicacao.Persistencia;

public interface IOperacaoConsultaRepository
{
    Task<IReadOnlyList<AssessoriaResumoDto>> ListarAssessoriasAsync(string? busca, SituacaoAssessoria? situacao, CancellationToken cancelamento);

    Task<DashboardOperacaoDto> ObterDashboardAsync(DateTimeOffset agora, CancellationToken cancelamento);
}
