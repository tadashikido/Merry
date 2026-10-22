using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Rsvp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/convites/{conviteId:guid}")]
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
    public async Task<ActionResult<LinkRsvpDto>> Obter(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.ObterAsync(casamentoId, conviteId, cancelamento));
    }

    [HttpPost("link-rsvp")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(LinkRsvpDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkRsvpDto>> Gerar(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.GerarAsync(casamentoId, conviteId, cancelamento));
    }

    [HttpPost("link-rsvp/regenerar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(LinkRsvpDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<LinkRsvpDto>> Regenerar(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.RegenerarAsync(casamentoId, conviteId, cancelamento));
    }

    [HttpDelete("link-rsvp")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Revogar(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        await _linkRsvpService.RevogarAsync(casamentoId, conviteId, cancelamento);
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
    public async Task<ActionResult<ConviteDto>> MarcarEnviado(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _linkRsvpService.MarcarEnviadoAsync(casamentoId, conviteId, cancelamento));
    }
}
