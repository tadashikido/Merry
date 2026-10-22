using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Financeiro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/financeiro/alertas")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarAlertasPagamentos)]
public class AlertasPagamentosController : ControllerBase
{
    private readonly IParcelaFornecedorService _parcelaService;

    public AlertasPagamentosController(IParcelaFornecedorService parcelaService)
    {
        _parcelaService = parcelaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AlertasPagamentosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AlertasPagamentosDto>> Obter(CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ObterAlertasOrganizacaoAsync(cancelamento));
    }
}
