using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Checklists;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/checklist")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarChecklist)]
public class ChecklistCasamentoController : ControllerBase
{
    private readonly IChecklistCasamentoService _checklistService;

    public ChecklistCasamentoController(IChecklistCasamentoService checklistService)
    {
        _checklistService = checklistService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ChecklistCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChecklistCasamentoDto>> Obter(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _checklistService.ObterAsync(casamentoId, cancelamento));
    }

    [HttpGet("previa")]
    [ProducesResponseType(typeof(AplicacaoModeloChecklistDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AplicacaoModeloChecklistDto>> Previa(
        Guid casamentoId,
        [FromQuery] Guid modeloId,
        CancellationToken cancelamento)
    {
        return Ok(await _checklistService.PreverAplicacaoAsync(casamentoId, modeloId, cancelamento));
    }

    [HttpPost("aplicacoes")]
    [ProducesResponseType(typeof(AplicacaoModeloChecklistDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AplicacaoModeloChecklistDto>> Aplicar(
        Guid casamentoId,
        AplicarModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _checklistService.AplicarAsync(casamentoId, request, cancelamento));
    }

    [HttpGet("recalculo-prazos")]
    [ProducesResponseType(typeof(RecalculoPrazosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecalculoPrazosDto>> ConsultarRecalculo(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _checklistService.ConsultarRecalculoAsync(casamentoId, cancelamento));
    }

    [HttpPost("recalculo-prazos")]
    [ProducesResponseType(typeof(RecalculoPrazosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RecalculoPrazosDto>> Recalcular(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _checklistService.RecalcularPrazosAsync(casamentoId, cancelamento));
    }
}
