using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.ModelosCronograma;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/cronograma")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
public class AplicacaoModeloCronogramaController : ControllerBase
{
    private readonly IAplicacaoModeloCronogramaService _aplicacaoService;
    private readonly IModeloCronogramaService _modeloService;

    public AplicacaoModeloCronogramaController(
        IAplicacaoModeloCronogramaService aplicacaoService,
        IModeloCronogramaService modeloService)
    {
        _aplicacaoService = aplicacaoService;
        _modeloService = modeloService;
    }

    [HttpPost("modelos")]
    [ProducesResponseType(typeof(ModeloCronogramaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ModeloCronogramaDto>> SalvarComoModelo(
        Guid eventoId,
        SalvarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        var modelo = await _modeloService.CriarDoEventoAsync(eventoId, request, cancelamento);
        return CreatedAtRoute(nameof(ModelosCronogramaController.ObterModeloCronograma), new { modeloId = modelo.Id }, modelo);
    }

    [HttpGet("previa")]
    [ProducesResponseType(typeof(AplicacaoModeloCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AplicacaoModeloCronogramaDto>> Previa(
        Guid eventoId,
        [FromQuery] Guid modeloId,
        CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.PreverAsync(eventoId, modeloId, cancelamento));
    }

    [HttpPost("aplicacoes")]
    [ProducesResponseType(typeof(AplicacaoModeloCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AplicacaoModeloCronogramaDto>> Aplicar(
        Guid eventoId,
        AplicarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.AplicarAsync(eventoId, request, cancelamento));
    }

    [HttpGet("recalculo-horarios")]
    [ProducesResponseType(typeof(RecalculoHorariosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecalculoHorariosDto>> ConsultarRecalculo(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.ConsultarRecalculoAsync(eventoId, cancelamento));
    }

    [HttpPost("recalculo-horarios")]
    [ProducesResponseType(typeof(RecalculoHorariosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RecalculoHorariosDto>> Recalcular(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.RecalcularAsync(eventoId, cancelamento));
    }
}
