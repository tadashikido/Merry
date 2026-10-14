using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.DadosSensiveis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarConvidados)]
[Authorize(Policy = PoliticasAutorizacao.ConsultarRestricoesAlimentares)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class RestricoesAlimentaresController : ControllerBase
{
    private readonly IRestricaoAlimentarService _restricaoAlimentarService;

    public RestricoesAlimentaresController(IRestricaoAlimentarService restricaoAlimentarService)
    {
        _restricaoAlimentarService = restricaoAlimentarService;
    }

    [HttpGet("restricoes-alimentares")]
    [ProducesResponseType(typeof(RelatorioRestricoesAlimentaresDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RelatorioRestricoesAlimentaresDto>> ObterRelatorio(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _restricaoAlimentarService.ObterRelatorioAsync(casamentoId, cancelamento));
    }

    [HttpPut("convites/{conviteId:guid}/convidados/{convidadoId:guid}/restricao-alimentar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarRestricoesAlimentares)]
    [ProducesResponseType(typeof(RestricaoAlimentarDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RestricaoAlimentarDto>> Salvar(
        Guid casamentoId,
        Guid conviteId,
        Guid convidadoId,
        SalvarRestricaoAlimentarRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _restricaoAlimentarService.SalvarAsync(casamentoId, conviteId, convidadoId, request, cancelamento));
    }

    [HttpDelete("convites/{conviteId:guid}/convidados/{convidadoId:guid}/restricao-alimentar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarRestricoesAlimentares)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid conviteId, Guid convidadoId, CancellationToken cancelamento)
    {
        await _restricaoAlimentarService.RemoverAsync(casamentoId, conviteId, convidadoId, cancelamento);
        return NoContent();
    }
}
