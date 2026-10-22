using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Tarefas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/tarefas/pendencias")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarPendenciasTarefas)]
public class PendenciasTarefasController : ControllerBase
{
    private readonly ITarefaEventoService _tarefaService;

    public PendenciasTarefasController(ITarefaEventoService tarefaService)
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
