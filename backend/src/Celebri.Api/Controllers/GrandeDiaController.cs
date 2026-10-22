using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.GrandeDia;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/grande-dia")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarCronograma)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class GrandeDiaController : ControllerBase
{
    private readonly IGrandeDiaService _grandeDiaService;

    public GrandeDiaController(IGrandeDiaService grandeDiaService)
    {
        _grandeDiaService = grandeDiaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(GrandeDiaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GrandeDiaDto>> Consultar(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _grandeDiaService.ConsultarAsync(eventoId, cancelamento));
    }

    [HttpPut("itens/{itemId:guid}/conclusao")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
    [ProducesResponseType(typeof(GrandeDiaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<GrandeDiaDto>> Concluir(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return Ok(await _grandeDiaService.ConcluirItemAsync(eventoId, itemId, cancelamento));
    }

    [HttpDelete("itens/{itemId:guid}/conclusao")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
    [ProducesResponseType(typeof(GrandeDiaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<GrandeDiaDto>> Reabrir(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return Ok(await _grandeDiaService.ReabrirItemAsync(eventoId, itemId, cancelamento));
    }
}
