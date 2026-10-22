using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Cronogramas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/cronograma")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarCronograma)]
public class CronogramaController : ControllerBase
{
    private readonly ICronogramaService _cronogramaService;

    public CronogramaController(ICronogramaService cronogramaService)
    {
        _cronogramaService = cronogramaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CronogramaDto>> Listar(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _cronogramaService.ListarAsync(casamentoId, cancelamento));
    }

    [HttpGet("{itemId:guid}", Name = nameof(ObterItemCronograma))]
    [ProducesResponseType(typeof(ItemCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ItemCronogramaDto>> ObterItemCronograma(
        Guid casamentoId,
        Guid itemId,
        CancellationToken cancelamento)
    {
        return Ok(await _cronogramaService.ObterAsync(casamentoId, itemId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
    [ProducesResponseType(typeof(ItemCronogramaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ItemCronogramaDto>> Criar(
        Guid casamentoId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento)
    {
        var item = await _cronogramaService.CriarAsync(casamentoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterItemCronograma), new { casamentoId, itemId = item.Id }, item);
    }

    [HttpPut("{itemId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
    [ProducesResponseType(typeof(ItemCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ItemCronogramaDto>> Atualizar(
        Guid casamentoId,
        Guid itemId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _cronogramaService.AtualizarAsync(casamentoId, itemId, request, cancelamento));
    }

    [HttpDelete("{itemId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCronograma)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        await _cronogramaService.RemoverAsync(casamentoId, itemId, cancelamento);
        return NoContent();
    }
}
