using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.CronogramaPublico;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/cronograma/links")]
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
    public async Task<ActionResult<LinksCronogramaDto>> Listar(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _linkCronogramaService.ListarAsync(casamentoId, cancelamento));
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
        Guid casamentoId,
        GerarLinkCronogramaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _linkCronogramaService.GerarAsync(casamentoId, request, cancelamento));
    }

    [HttpPost("{linkId:guid}/regenerar")]
    [ProducesResponseType(typeof(LinkCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkCronogramaDto>> Regenerar(Guid casamentoId, Guid linkId, CancellationToken cancelamento)
    {
        return Ok(await _linkCronogramaService.RegenerarAsync(casamentoId, linkId, cancelamento));
    }

    [HttpDelete("{linkId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Revogar(Guid casamentoId, Guid linkId, CancellationToken cancelamento)
    {
        await _linkCronogramaService.RevogarAsync(casamentoId, linkId, cancelamento);
        return NoContent();
    }
}
