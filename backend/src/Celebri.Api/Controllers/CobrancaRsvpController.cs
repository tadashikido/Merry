using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Confirmacoes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/convites/{conviteId:guid}")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class CobrancaRsvpController : ControllerBase
{
    private readonly ICobrancaRsvpService _cobrancaRsvpService;

    public CobrancaRsvpController(ICobrancaRsvpService cobrancaRsvpService)
    {
        _cobrancaRsvpService = cobrancaRsvpService;
    }

    [HttpPost("cobranca")]
    [ProducesResponseType(typeof(CobrancaRsvpDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CobrancaRsvpDto>> Registrar(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _cobrancaRsvpService.RegistrarAsync(eventoId, conviteId, cancelamento));
    }
}
