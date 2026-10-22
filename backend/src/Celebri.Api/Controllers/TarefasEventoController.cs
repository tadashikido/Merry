using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Tarefas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/tarefas")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarTarefas)]
public class TarefasEventoController : ControllerBase
{
    private readonly ITarefaEventoService _tarefaService;

    public TarefasEventoController(ITarefaEventoService tarefaService)
    {
        _tarefaService = tarefaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ListaTarefasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListaTarefasDto>> Listar(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.ListarAsync(eventoId, cancelamento));
    }

    [HttpGet("{tarefaId:guid}", Name = nameof(ObterTarefa))]
    [ProducesResponseType(typeof(TarefaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TarefaDto>> ObterTarefa(Guid eventoId, Guid tarefaId, CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.ObterAsync(eventoId, tarefaId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarTarefas)]
    [ProducesResponseType(typeof(TarefaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TarefaDto>> Criar(Guid eventoId, SalvarTarefaRequest request, CancellationToken cancelamento)
    {
        var tarefa = await _tarefaService.CriarAsync(eventoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterTarefa), new { eventoId, tarefaId = tarefa.Id }, tarefa);
    }

    [HttpPut("{tarefaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarTarefas)]
    [ProducesResponseType(typeof(TarefaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TarefaDto>> Atualizar(
        Guid eventoId,
        Guid tarefaId,
        SalvarTarefaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.AtualizarAsync(eventoId, tarefaId, request, cancelamento));
    }

    [HttpPatch("{tarefaId:guid}/status")]
    [Authorize(Policy = PoliticasAutorizacao.AlterarStatusTarefas)]
    [ProducesResponseType(typeof(TarefaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TarefaDto>> AlterarStatus(
        Guid eventoId,
        Guid tarefaId,
        AlterarStatusTarefaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.AlterarStatusAsync(eventoId, tarefaId, request, cancelamento));
    }

    [HttpDelete("{tarefaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarTarefas)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid eventoId, Guid tarefaId, CancellationToken cancelamento)
    {
        await _tarefaService.RemoverAsync(eventoId, tarefaId, cancelamento);
        return NoContent();
    }
}
