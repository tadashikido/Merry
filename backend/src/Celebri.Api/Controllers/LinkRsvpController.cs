using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Rsvp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/convites/{conviteId:guid}")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarConvidados)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class LinkRsvpController : ControllerBase
{
    private readonly ILinkRsvpService _linkRsvpService;

    public LinkRsvpController(ILinkRsvpService linkRsvpService)
    {
        _linkRsvpService = linkRsvpService;
    }

    [HttpGet("link-rsvp")]
    [ProducesResponseType(typeof(LinkRsvpDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LinkRsvpDto>> Obter(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.ObterAsync(eventoId, conviteId, cancelamento));
    }

    [HttpPost("link-rsvp")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(LinkRsvpDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkRsvpDto>> Gerar(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.GerarAsync(eventoId, conviteId, cancelamento));
    }

    [HttpPost("link-rsvp/regenerar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(LinkRsvpDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkRsvpDto>> Regenerar(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.RegenerarAsync(eventoId, conviteId, cancelamento));
    }

    [HttpDelete("link-rsvp")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Revogar(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        await _linkRsvpService.RevogarAsync(eventoId, conviteId, cancelamento);
        return NoContent();
    }

    [HttpPost("envio")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(ConviteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ConviteDto>> MarcarEnviado(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.MarcarEnviadoAsync(eventoId, conviteId, cancelamento));
    }
}
