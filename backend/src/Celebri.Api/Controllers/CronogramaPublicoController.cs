using Celebri.Api.Autenticacao;
using Celebri.Aplicacao.CronogramaPublico;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/cronograma-publico")]
[Produces("application/json")]
[AllowAnonymous]
[EnableRateLimiting(PoliticasLimiteRequisicao.CronogramaPublico)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class CronogramaPublicoController : ControllerBase
{
    private readonly ICronogramaPublicoService _cronogramaPublicoService;

    public CronogramaPublicoController(ICronogramaPublicoService cronogramaPublicoService)
    {
        _cronogramaPublicoService = cronogramaPublicoService;
    }

    [HttpPost("consulta")]
    [ProducesResponseType(typeof(CronogramaPublicoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<CronogramaPublicoDto>> Consultar(ConsultarCronogramaPublicoRequest request, CancellationToken cancelamento)
    {
        return Ok(await _cronogramaPublicoService.ConsultarAsync(request, cancelamento));
    }
}
