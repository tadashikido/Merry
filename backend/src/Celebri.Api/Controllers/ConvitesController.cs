using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Convidados;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/convites")]
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
    public async Task<ActionResult<ListaConvitesDto>> Listar(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _conviteService.ListarAsync(casamentoId, cancelamento));
    }

    [HttpGet("totais")]
    [ProducesResponseType(typeof(TotaisConvidadosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TotaisConvidadosDto>> ObterTotais(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _conviteService.ObterTotaisAsync(casamentoId, cancelamento));
    }

    [HttpGet("{conviteId:guid}", Name = nameof(ObterConvite))]
    [ProducesResponseType(typeof(ConviteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ConviteDto>> ObterConvite(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return Ok(await _conviteService.ObterAsync(casamentoId, conviteId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(typeof(ConviteDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ConviteDto>> Criar(Guid casamentoId, SalvarConviteRequest request, CancellationToken cancelamento)
    {
        var convite = await _conviteService.CriarAsync(casamentoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterConvite), new { casamentoId, conviteId = convite.Id }, convite);
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
        Guid casamentoId,
        Guid conviteId,
        SalvarConviteRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _conviteService.AtualizarAsync(casamentoId, conviteId, request, cancelamento));
    }

    [HttpDelete("{conviteId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        await _conviteService.RemoverAsync(casamentoId, conviteId, cancelamento);
        return NoContent();
    }
}
