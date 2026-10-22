using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Eventos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarEventos)]
public class EventosController : ControllerBase
{
    private readonly IEventoService _eventoService;
    private readonly IProximosPassosEventoService _proximosPassosService;

    public EventosController(IEventoService eventoService, IProximosPassosEventoService proximosPassosService)
    {
        _eventoService = eventoService;
        _proximosPassosService = proximosPassosService;
    }

    [HttpGet]
    [Authorize(Policy = PoliticasAutorizacao.ListarEventos)]
    [ProducesResponseType(typeof(IReadOnlyList<EventoResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<EventoResumoDto>>> Listar(
        [FromQuery] SituacaoListagemEventos situacao = SituacaoListagemEventos.Ativos,
        CancellationToken cancelamento = default)
    {
        return Ok(await _eventoService.ListarAsync(situacao, cancelamento));
    }

    [HttpGet("{id:guid}", Name = nameof(Obter))]
    [ProducesResponseType(typeof(EventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventoDto>> Obter(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _eventoService.ObterAsync(id, cancelamento));
    }

    [HttpGet("{id:guid}/proximos-passos")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarEventos)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(typeof(ProximosPassosEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProximosPassosEventoDto>> ObterProximosPassos(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _proximosPassosService.ObterAsync(id, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarEventos)]
    [ProducesResponseType(typeof(EventoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<EventoDto>> Criar(SalvarEventoRequest request, CancellationToken cancelamento)
    {
        var evento = await _eventoService.CriarAsync(request, cancelamento);
        return CreatedAtRoute(nameof(Obter), new { id = evento.Id }, evento);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarEventos)]
    [ProducesResponseType(typeof(EventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<EventoDto>> Atualizar(Guid id, SalvarEventoRequest request, CancellationToken cancelamento)
    {
        return Ok(await _eventoService.AtualizarAsync(id, request, cancelamento));
    }

    [HttpPost("{id:guid}/arquivar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarEventos)]
    [ProducesResponseType(typeof(EventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventoDto>> Arquivar(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _eventoService.ArquivarAsync(id, cancelamento));
    }

    [HttpPost("{id:guid}/restaurar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarEventos)]
    [ProducesResponseType(typeof(EventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventoDto>> Restaurar(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _eventoService.RestaurarAsync(id, cancelamento));
    }
}
