using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Financeiro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/financeiro")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarFinanceiroCasamento)]
public class FinanceiroCasamentoController : ControllerBase
{
    private readonly IParcelaFornecedorService _parcelaService;

    public FinanceiroCasamentoController(IParcelaFornecedorService parcelaService)
    {
        _parcelaService = parcelaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(FinanceiroCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FinanceiroCasamentoDto>> Obter(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ObterFinanceiroAsync(casamentoId, cancelamento));
    }

    [HttpGet("alertas")]
    [ProducesResponseType(typeof(AlertasPagamentosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlertasPagamentosDto>> ObterAlertas(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ObterAlertasCasamentoAsync(casamentoId, cancelamento));
    }
}
