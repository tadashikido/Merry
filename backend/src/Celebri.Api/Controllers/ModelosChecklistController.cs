using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Checklists;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/modelos-checklist")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarModelosChecklist)]
public class ModelosChecklistController : ControllerBase
{
    private readonly IModeloChecklistService _modeloService;

    public ModelosChecklistController(IModeloChecklistService modeloService)
    {
        _modeloService = modeloService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ModeloChecklistResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<ModeloChecklistResumoDto>>> Listar(CancellationToken cancelamento)
    {
        return Ok(await _modeloService.ListarAsync(cancelamento));
    }

    [HttpGet("{modeloId:guid}", Name = nameof(ObterModeloChecklist))]
    [ProducesResponseType(typeof(ModeloChecklistDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ModeloChecklistDto>> ObterModeloChecklist(Guid modeloId, CancellationToken cancelamento)
    {
        return Ok(await _modeloService.ObterAsync(modeloId, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ModeloChecklistDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ModeloChecklistDto>> Criar(SalvarModeloChecklistRequest request, CancellationToken cancelamento)
    {
        var modelo = await _modeloService.CriarAsync(request, cancelamento);
        return CreatedAtRoute(nameof(ObterModeloChecklist), new { modeloId = modelo.Id }, modelo);
    }

    [HttpPut("{modeloId:guid}")]
    [ProducesResponseType(typeof(ModeloChecklistDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ModeloChecklistDto>> Atualizar(
        Guid modeloId,
        SalvarModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _modeloService.AtualizarAsync(modeloId, request, cancelamento));
    }

    [HttpDelete("{modeloId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remover(Guid modeloId, CancellationToken cancelamento)
    {
        await _modeloService.RemoverAsync(modeloId, cancelamento);
        return NoContent();
    }

    [HttpPost("{modeloId:guid}/itens")]
    [ProducesResponseType(typeof(ItemModeloChecklistDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ItemModeloChecklistDto>> CriarItem(
        Guid modeloId,
        SalvarItemModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        var item = await _modeloService.CriarItemAsync(modeloId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterModeloChecklist), new { modeloId }, item);
    }

    [HttpPut("{modeloId:guid}/itens/{itemId:guid}")]
    [ProducesResponseType(typeof(ItemModeloChecklistDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ItemModeloChecklistDto>> AtualizarItem(
        Guid modeloId,
        Guid itemId,
        SalvarItemModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _modeloService.AtualizarItemAsync(modeloId, itemId, request, cancelamento));
    }

    [HttpDelete("{modeloId:guid}/itens/{itemId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoverItem(Guid modeloId, Guid itemId, CancellationToken cancelamento)
    {
        await _modeloService.RemoverItemAsync(modeloId, itemId, cancelamento);
        return NoContent();
    }
}
