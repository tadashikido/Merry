using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.CronogramaPublico;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/cronograma/links")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class LinksCronogramaController : ControllerBase
{
    private readonly ILinkCronogramaService _linkCronogramaService;

    public LinksCronogramaController(ILinkCronogramaService linkCronogramaService)
    {
        _linkCronogramaService = linkCronogramaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(LinksCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LinksCronogramaDto>> Listar(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _linkCronogramaService.ListarAsync(eventoId, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(LinkCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkCronogramaDto>> Gerar(
        Guid eventoId,
        GerarLinkCronogramaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _linkCronogramaService.GerarAsync(eventoId, request, cancelamento));
    }

    [HttpPost("{linkId:guid}/regenerar")]
    [ProducesResponseType(typeof(LinkCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkCronogramaDto>> Regenerar(Guid eventoId, Guid linkId, CancellationToken cancelamento)
    {
        return Ok(await _linkCronogramaService.RegenerarAsync(eventoId, linkId, cancelamento));
    }

    [HttpDelete("{linkId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Revogar(Guid eventoId, Guid linkId, CancellationToken cancelamento)
    {
        await _linkCronogramaService.RevogarAsync(eventoId, linkId, cancelamento);
        return NoContent();
    }
}
