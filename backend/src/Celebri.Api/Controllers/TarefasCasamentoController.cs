using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Tarefas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/tarefas")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarTarefas)]
public class TarefasCasamentoController : ControllerBase
{
    private readonly ITarefaCasamentoService _tarefaService;

    public TarefasCasamentoController(ITarefaCasamentoService tarefaService)
    {
        _tarefaService = tarefaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ListaTarefasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListaTarefasDto>> Listar(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.ListarAsync(casamentoId, cancelamento));
    }

    [HttpGet("{tarefaId:guid}", Name = nameof(ObterTarefa))]
    [ProducesResponseType(typeof(TarefaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TarefaDto>> ObterTarefa(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.ObterAsync(casamentoId, tarefaId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarTarefas)]
    [ProducesResponseType(typeof(TarefaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<TarefaDto>> Criar(Guid casamentoId, SalvarTarefaRequest request, CancellationToken cancelamento)
    {
        var tarefa = await _tarefaService.CriarAsync(casamentoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterTarefa), new { casamentoId, tarefaId = tarefa.Id }, tarefa);
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
        Guid casamentoId,
        Guid tarefaId,
        SalvarTarefaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.AtualizarAsync(casamentoId, tarefaId, request, cancelamento));
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
        Guid casamentoId,
        Guid tarefaId,
        AlterarStatusTarefaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.AlterarStatusAsync(casamentoId, tarefaId, request, cancelamento));
    }

    [HttpDelete("{tarefaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarTarefas)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento)
    {
        await _tarefaService.RemoverAsync(casamentoId, tarefaId, cancelamento);
        return NoContent();
    }
}
