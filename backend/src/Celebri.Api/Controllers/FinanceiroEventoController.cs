using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Financeiro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/financeiro")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarFinanceiroEvento)]
public class FinanceiroEventoController : ControllerBase
{
    private readonly IParcelaFornecedorService _parcelaService;

    public FinanceiroEventoController(IParcelaFornecedorService parcelaService)
    {
        _parcelaService = parcelaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(FinanceiroEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FinanceiroEventoDto>> Obter(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ObterFinanceiroAsync(eventoId, cancelamento));
    }

    [HttpGet("alertas")]
    [ProducesResponseType(typeof(AlertasPagamentosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertasPagamentosDto>> ObterAlertas(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ObterAlertasEventoAsync(eventoId, cancelamento));
    }
}
