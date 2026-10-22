using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.AcessosCasal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/acessos-casal")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarAcessoCasal)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AcessosCasalController : ControllerBase
{
    private readonly IAcessoCasalService _acessoCasalService;

    public AcessosCasalController(IAcessoCasalService acessoCasalService)
    {
        _acessoCasalService = acessoCasalService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AcessoCasalDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<AcessoCasalDto>>> Listar(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _acessoCasalService.ListarAsync(casamentoId, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(AcessoCasalDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AcessoCasalDto>> Convidar(Guid casamentoId, ConvidarCasalRequest request, CancellationToken cancelamento)
    {
        var acesso = await _acessoCasalService.ConvidarAsync(casamentoId, request, cancelamento);
        return StatusCode(StatusCodes.Status201Created, acesso);
    }

    [HttpPost("{acessoId:guid}/reenvio")]
    [ProducesResponseType(typeof(AcessoCasalDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AcessoCasalDto>> Reenviar(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        return Ok(await _acessoCasalService.ReenviarAsync(casamentoId, acessoId, cancelamento));
    }

    [HttpDelete("{acessoId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Revogar(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        await _acessoCasalService.RevogarAsync(casamentoId, acessoId, cancelamento);
        return NoContent();
    }
}
