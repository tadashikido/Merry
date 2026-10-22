using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.ModelosCronograma;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/modelos-cronograma")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarModelosCronograma)]
public class ModelosCronogramaController : ControllerBase
{
    private readonly IModeloCronogramaService _modeloService;

    public ModelosCronogramaController(IModeloCronogramaService modeloService)
    {
        _modeloService = modeloService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ModeloCronogramaResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<ModeloCronogramaResumoDto>>> Listar(CancellationToken cancelamento)
    {
        return Ok(await _modeloService.ListarAsync(cancelamento));
    }

    [HttpGet("{modeloId:guid}", Name = nameof(ObterModeloCronograma))]
    [ProducesResponseType(typeof(ModeloCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ModeloCronogramaDto>> ObterModeloCronograma(Guid modeloId, CancellationToken cancelamento)
    {
        return Ok(await _modeloService.ObterAsync(modeloId, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ModeloCronogramaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ModeloCronogramaDto>> Criar(SalvarModeloCronogramaRequest request, CancellationToken cancelamento)
    {
        var modelo = await _modeloService.CriarAsync(request, cancelamento);
        return CreatedAtRoute(nameof(ObterModeloCronograma), new { modeloId = modelo.Id }, modelo);
    }

    [HttpPut("{modeloId:guid}")]
    [ProducesResponseType(typeof(ModeloCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ModeloCronogramaDto>> Atualizar(
        Guid modeloId,
        SalvarModeloCronogramaRequest request,
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
    [ProducesResponseType(typeof(ItemModeloCronogramaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ItemModeloCronogramaDto>> CriarItem(
        Guid modeloId,
        SalvarItemModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        var item = await _modeloService.CriarItemAsync(modeloId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterModeloCronograma), new { modeloId }, item);
    }

    [HttpPut("{modeloId:guid}/itens/{itemId:guid}")]
    [ProducesResponseType(typeof(ItemModeloCronogramaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ItemModeloCronogramaDto>> AtualizarItem(
        Guid modeloId,
        Guid itemId,
        SalvarItemModeloCronogramaRequest request,
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
