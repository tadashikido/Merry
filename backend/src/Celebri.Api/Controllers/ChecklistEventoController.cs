using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Checklists;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/checklist")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarChecklist)]
public class ChecklistEventoController : ControllerBase
{
    private readonly IChecklistEventoService _checklistService;

    public ChecklistEventoController(IChecklistEventoService checklistService)
    {
        _checklistService = checklistService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ChecklistEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChecklistEventoDto>> Obter(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _checklistService.ObterAsync(eventoId, cancelamento));
    }

    [HttpGet("previa")]
    [ProducesResponseType(typeof(AplicacaoModeloChecklistDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AplicacaoModeloChecklistDto>> Previa(
        Guid eventoId,
        [FromQuery] Guid modeloId,
        CancellationToken cancelamento)
    {
        return Ok(await _checklistService.PreverAplicacaoAsync(eventoId, modeloId, cancelamento));
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
        Guid eventoId,
        AplicarModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _checklistService.AplicarAsync(eventoId, request, cancelamento));
    }

    [HttpGet("recalculo-prazos")]
    [ProducesResponseType(typeof(RecalculoPrazosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecalculoPrazosDto>> ConsultarRecalculo(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _checklistService.ConsultarRecalculoAsync(eventoId, cancelamento));
    }

    [HttpPost("recalculo-prazos")]
    [ProducesResponseType(typeof(RecalculoPrazosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RecalculoPrazosDto>> Recalcular(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _checklistService.RecalcularPrazosAsync(eventoId, cancelamento));
    }
}
