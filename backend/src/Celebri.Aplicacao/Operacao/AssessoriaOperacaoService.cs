using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Microsoft.Extensions.Logging;

namespace Celebri.Aplicacao.Operacao;

public class AssessoriaOperacaoService : IAssessoriaOperacaoService
{
    private readonly IOperacaoConsultaRepository _consulta;
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly ILogger<AssessoriaOperacaoService> _logger;

    public AssessoriaOperacaoService(
        IOperacaoConsultaRepository consulta,
        IOrganizacaoRepository organizacaoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        ILogger<AssessoriaOperacaoService> logger)
    {
        _consulta = consulta;
        _organizacaoRepository = organizacaoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _logger = logger;
    }

    public Task<IReadOnlyList<AssessoriaResumoDto>> ListarAsync(string? busca, SituacaoAssessoria? situacao, CancellationToken cancelamento)
    {
        return _consulta.ListarAssessoriasAsync(busca, situacao, cancelamento);
    }

    public Task<DashboardOperacaoDto> ObterDashboardAsync(CancellationToken cancelamento)
    {
        return _consulta.ObterDashboardAsync(_relogio.GetUtcNow(), cancelamento);
    }

    public async Task SuspenderAsync(Guid organizacaoId, CancellationToken cancelamento)
    {
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(organizacaoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensOperacao.AssessoriaNaoEncontrada);

        organizacao.Suspender(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
        RegistrarSuspensao(_logger, organizacaoId);
    }

    public async Task ReativarAsync(Guid organizacaoId, CancellationToken cancelamento)
    {
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(organizacaoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensOperacao.AssessoriaNaoEncontrada);

        organizacao.Reativar();
        await _unidadeTrabalho.SalvarAsync(cancelamento);
        RegistrarReativacao(_logger, organizacaoId);
    }

    private static void RegistrarSuspensao(ILogger logger, Guid organizacaoId)
    {
        logger.LogInformation("Assessoria {OrganizacaoId} suspensa por operador de plataforma.", organizacaoId);
    }

    private static void RegistrarReativacao(ILogger logger, Guid organizacaoId)
    {
        logger.LogInformation("Assessoria {OrganizacaoId} reativada por operador de plataforma.", organizacaoId);
    }
}
