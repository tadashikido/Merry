using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.ModelosCronograma;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/cronograma")]
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
        Guid casamentoId,
        SalvarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        var modelo = await _modeloService.CriarDoCasamentoAsync(casamentoId, request, cancelamento);
        return CreatedAtRoute(nameof(ModelosCronogramaController.ObterModeloCronograma), new { modeloId = modelo.Id }, modelo);
    }

    [HttpGet("previa")]
    [ProducesResponseType(typeof(AplicacaoModeloCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AplicacaoModeloCronogramaDto>> Previa(
        Guid casamentoId,
        [FromQuery] Guid modeloId,
        CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.PreverAsync(casamentoId, modeloId, cancelamento));
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
        Guid casamentoId,
        AplicarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.AplicarAsync(casamentoId, request, cancelamento));
    }

    [HttpGet("recalculo-horarios")]
    [ProducesResponseType(typeof(RecalculoHorariosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecalculoHorariosDto>> ConsultarRecalculo(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.ConsultarRecalculoAsync(casamentoId, cancelamento));
    }

    [HttpPost("recalculo-horarios")]
    [ProducesResponseType(typeof(RecalculoHorariosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RecalculoHorariosDto>> Recalcular(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _aplicacaoService.RecalcularAsync(casamentoId, cancelamento));
    }
}
