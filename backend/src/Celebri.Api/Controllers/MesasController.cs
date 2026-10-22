using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Mesas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/mesas")]
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
    public async Task<ActionResult<MapaMesasDto>> ObterMapa(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.ObterMapaAsync(eventoId, cancelamento));
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
    public async Task<ActionResult<MesaDto>> Criar(Guid eventoId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        var mesa = await _mesaService.CriarAsync(eventoId, request, cancelamento);
        return Created($"/api/eventos/{eventoId}/mesas/{mesa.Id}", mesa);
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
    public async Task<ActionResult<MesaDto>> Atualizar(Guid eventoId, Guid mesaId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.AtualizarAsync(eventoId, mesaId, request, cancelamento));
    }

    [HttpDelete("{mesaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarMesas)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        await _mesaService.RemoverAsync(eventoId, mesaId, cancelamento);
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
    public async Task<ActionResult<MapaMesasDto>> Sentar(Guid eventoId, Guid mesaId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.SentarAsync(eventoId, mesaId, request, cancelamento));
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
    public async Task<ActionResult<MapaMesasDto>> Retirar(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.RetirarAsync(eventoId, request, cancelamento));
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
    public async Task<ActionResult<MapaMesasDto>> DispensarAvisos(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        return Ok(await _mesaService.DispensarAvisosAsync(eventoId, request, cancelamento));
    }
}
