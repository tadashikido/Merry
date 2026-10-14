using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.Tarefas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/tarefas/pendencias")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarPendenciasTarefas)]
public class PendenciasTarefasController : ControllerBase
{
    private readonly ITarefaCasamentoService _tarefaService;

    public PendenciasTarefasController(ITarefaCasamentoService tarefaService)
    {
        _tarefaService = tarefaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PendenciasTarefasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PendenciasTarefasDto>> Obter(CancellationToken cancelamento)
    {
        return Ok(await _tarefaService.ObterPendenciasAsync(cancelamento));
    }
}
