using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Confirmacoes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarConvidados)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class PainelConfirmacoesController : ControllerBase
{
    private readonly IPainelConfirmacoesService _painelConfirmacoesService;

    public PainelConfirmacoesController(IPainelConfirmacoesService painelConfirmacoesService)
    {
        _painelConfirmacoesService = painelConfirmacoesService;
    }

    [HttpGet("painel-confirmacoes")]
    [ProducesResponseType(typeof(PainelConfirmacoesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PainelConfirmacoesDto>> ObterPainel(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _painelConfirmacoesService.ObterAsync(eventoId, cancelamento));
    }

    [HttpGet("exportacao-buffet")]
    [Authorize(Policy = PoliticasAutorizacao.ConsultarRestricoesAlimentares)]
    [ProducesResponseType(typeof(ExportacaoBuffetDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExportacaoBuffetDto>> ExportarBuffet(
        Guid eventoId,
        [FromQuery] ExportarBuffetRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _painelConfirmacoesService.ExportarBuffetAsync(eventoId, request, cancelamento));
    }
}
