using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.AcessosAnfitriao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/acessos-anfitriao")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarAcessoAnfitriao)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AcessosAnfitriaoController : ControllerBase
{
    private readonly IAcessoAnfitriaoService _acessoAnfitriaoService;

    public AcessosAnfitriaoController(IAcessoAnfitriaoService acessoAnfitriaoService)
    {
        _acessoAnfitriaoService = acessoAnfitriaoService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AcessoAnfitriaoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<AcessoAnfitriaoDto>>> Listar(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _acessoAnfitriaoService.ListarAsync(eventoId, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(AcessoAnfitriaoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AcessoAnfitriaoDto>> Convidar(Guid eventoId, ConvidarAnfitriaoRequest request, CancellationToken cancelamento)
    {
        var acesso = await _acessoAnfitriaoService.ConvidarAsync(eventoId, request, cancelamento);
        return StatusCode(StatusCodes.Status201Created, acesso);
    }

    [HttpPost("{acessoId:guid}/reenvio")]
    [ProducesResponseType(typeof(AcessoAnfitriaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AcessoAnfitriaoDto>> Reenviar(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        return Ok(await _acessoAnfitriaoService.ReenviarAsync(eventoId, acessoId, cancelamento));
    }

    [HttpDelete("{acessoId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Revogar(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        await _acessoAnfitriaoService.RevogarAsync(eventoId, acessoId, cancelamento);
        return NoContent();
    }
}
