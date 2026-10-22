using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Eventos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{origemId:guid}/duplicacao")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarEventos)]
public class DuplicacaoEventoController : ControllerBase
{
    private readonly IDuplicacaoEventoService _duplicacaoService;

    public DuplicacaoEventoController(IDuplicacaoEventoService duplicacaoService)
    {
        _duplicacaoService = duplicacaoService;
    }

    [HttpGet("previa")]
    [ProducesResponseType(typeof(PreviaDuplicacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PreviaDuplicacaoDto>> Previa(
        Guid origemId,
        [FromQuery] DateOnly? data,
        CancellationToken cancelamento)
    {
        return Ok(await _duplicacaoService.PreverAsync(origemId, data, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(DuplicacaoEventoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<DuplicacaoEventoDto>> Duplicar(
        Guid origemId,
        DuplicarEventoRequest request,
        CancellationToken cancelamento)
    {
        var resultado = await _duplicacaoService.DuplicarAsync(origemId, request, cancelamento);
        return CreatedAtRoute(nameof(EventosController.Obter), new { id = resultado.Evento.Id }, resultado);
    }
}
