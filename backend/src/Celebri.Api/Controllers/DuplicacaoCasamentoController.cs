using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Casamentos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{origemId:guid}/duplicacao")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarCasamentos)]
public class DuplicacaoCasamentoController : ControllerBase
{
    private readonly IDuplicacaoCasamentoService _duplicacaoService;

    public DuplicacaoCasamentoController(IDuplicacaoCasamentoService duplicacaoService)
    {
        _duplicacaoService = duplicacaoService;
    }

    [HttpGet("previa")]
    [ProducesResponseType(typeof(PreviaDuplicacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PreviaDuplicacaoDto>> Previa(
        Guid origemId,
        [FromQuery] DateOnly? data,
        CancellationToken cancelamento)
    {
        return Ok(await _duplicacaoService.PreverAsync(origemId, data, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(DuplicacaoCasamentoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<DuplicacaoCasamentoDto>> Duplicar(
        Guid origemId,
        DuplicarCasamentoRequest request,
        CancellationToken cancelamento)
    {
        var resultado = await _duplicacaoService.DuplicarAsync(origemId, request, cancelamento);
        return CreatedAtRoute(nameof(CasamentosController.Obter), new { id = resultado.Casamento.Id }, resultado);
    }
}
