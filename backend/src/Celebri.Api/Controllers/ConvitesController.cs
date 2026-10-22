using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Convidados;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/convites")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarConvidados)]
public class ConvitesController : ControllerBase
{
    private readonly IConviteService _conviteService;

    public ConvitesController(IConviteService conviteService)
    {
        _conviteService = conviteService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ListaConvitesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListaConvitesDto>> Listar(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _conviteService.ListarAsync(eventoId, cancelamento));
    }

    [HttpGet("totais")]
    [ProducesResponseType(typeof(TotaisConvidadosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TotaisConvidadosDto>> ObterTotais(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _conviteService.ObterTotaisAsync(eventoId, cancelamento));
    }

    [HttpGet("{conviteId:guid}", Name = nameof(ObterConvite))]
    [ProducesResponseType(typeof(ConviteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ConviteDto>> ObterConvite(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _conviteService.ObterAsync(eventoId, conviteId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(ConviteDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ConviteDto>> Criar(Guid eventoId, SalvarConviteRequest request, CancellationToken cancelamento)
    {
        var convite = await _conviteService.CriarAsync(eventoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterConvite), new { eventoId, conviteId = convite.Id }, convite);
    }

    [HttpPut("{conviteId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(ConviteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ConviteDto>> Atualizar(
        Guid eventoId,
        Guid conviteId,
        SalvarConviteRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _conviteService.AtualizarAsync(eventoId, conviteId, request, cancelamento));
    }

    [HttpDelete("{conviteId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        await _conviteService.RemoverAsync(eventoId, conviteId, cancelamento);
        return NoContent();
    }
}
