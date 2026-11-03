using Celebri.Api.Autenticacao;
using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Operacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/operador")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.Operacao, AuthenticationSchemes = EsquemasAutenticacao.Operador)]
public class OperacaoAssessoriasController : ControllerBase
{
    private readonly IAssessoriaOperacaoService _assessoriaOperacaoService;

    public OperacaoAssessoriasController(IAssessoriaOperacaoService assessoriaOperacaoService)
    {
        _assessoriaOperacaoService = assessoriaOperacaoService;
    }

    [HttpGet("assessorias")]
    [ProducesResponseType(typeof(IReadOnlyList<AssessoriaResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<AssessoriaResumoDto>>> Listar(
        [FromQuery] string? busca,
        [FromQuery] SituacaoAssessoria? situacao,
        CancellationToken cancelamento)
    {
        return Ok(await _assessoriaOperacaoService.ListarAsync(busca, situacao, cancelamento));
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardOperacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<DashboardOperacaoDto>> Dashboard(CancellationToken cancelamento)
    {
        return Ok(await _assessoriaOperacaoService.ObterDashboardAsync(cancelamento));
    }

    [HttpPost("assessorias/{id:guid}/suspender")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Suspender(Guid id, CancellationToken cancelamento)
    {
        await _assessoriaOperacaoService.SuspenderAsync(id, cancelamento);
        return NoContent();
    }

    [HttpPost("assessorias/{id:guid}/reativar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reativar(Guid id, CancellationToken cancelamento)
    {
        await _assessoriaOperacaoService.ReativarAsync(id, cancelamento);
        return NoContent();
    }
}
