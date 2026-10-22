using Casamento.Api.Autenticacao;
using Casamento.Aplicacao.Rsvp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/rsvp")]
[Produces("application/json")]
[AllowAnonymous]
[EnableRateLimiting(PoliticasLimiteRequisicao.Rsvp)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class RsvpPublicoController : ControllerBase
{
    private readonly IRsvpPublicoService _rsvpPublicoService;

    public RsvpPublicoController(IRsvpPublicoService rsvpPublicoService)
    {
        _rsvpPublicoService = rsvpPublicoService;
    }

    [HttpPost("consulta")]
    [ProducesResponseType(typeof(RsvpPublicoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RsvpPublicoDto>> Consultar(ConsultarRsvpRequest request, CancellationToken cancelamento)
    {
        return Ok(await _rsvpPublicoService.ConsultarAsync(request, cancelamento));
    }

    [HttpPut("resposta")]
    [ProducesResponseType(typeof(RsvpPublicoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RsvpPublicoDto>> Responder(ResponderRsvpRequest request, CancellationToken cancelamento)
    {
        return Ok(await _rsvpPublicoService.ResponderAsync(request, cancelamento));
    }
}
