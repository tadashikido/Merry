using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Mesas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/mesas")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarMesas)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class MesasController : ControllerBase
{
    private readonly IMesaService _mesaService;

    public MesasController(IMesaService mesaService)
    {
        _mesaService = mesaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(MapaMesasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MapaMesasDto>> ObterMapa(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.ObterMapaAsync(casamentoId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(typeof(MesaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MesaDto>> Criar(Guid casamentoId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        var mesa = await _mesaService.CriarAsync(casamentoId, request, cancelamento);
        return Created($"/api/casamentos/{casamentoId}/mesas/{mesa.Id}", mesa);
    }

    [HttpPut("{mesaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(typeof(MesaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MesaDto>> Atualizar(Guid casamentoId, Guid mesaId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.AtualizarAsync(casamentoId, mesaId, request, cancelamento));
    }

    [HttpDelete("{mesaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        await _mesaService.RemoverAsync(casamentoId, mesaId, cancelamento);
        return NoContent();
    }

    [HttpPost("{mesaId:guid}/pessoas")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(typeof(MapaMesasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MapaMesasDto>> Sentar(Guid casamentoId, Guid mesaId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.SentarAsync(casamentoId, mesaId, request, cancelamento));
    }

    [HttpPost("retirada")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(typeof(MapaMesasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MapaMesasDto>> Retirar(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.RetirarAsync(casamentoId, request, cancelamento));
    }

    [HttpPost("avisos-saida/dispensa")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(typeof(MapaMesasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<MapaMesasDto>> DispensarAvisos(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.DispensarAvisosAsync(casamentoId, request, cancelamento));
    }
}
