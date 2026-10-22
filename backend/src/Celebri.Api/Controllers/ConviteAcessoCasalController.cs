using Celebri.Api.Autenticacao;
using Celebri.Aplicacao.AcessosCasal;
using Celebri.Aplicacao.Autenticacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/acesso-casal")]
[Produces("application/json")]
[AllowAnonymous]
[EnableRateLimiting(PoliticasLimiteRequisicao.AcessoCasal)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class ConviteAcessoCasalController : ControllerBase
{
    private readonly IAcessoCasalService _acessoCasalService;

    public ConviteAcessoCasalController(IAcessoCasalService acessoCasalService)
    {
        _acessoCasalService = acessoCasalService;
    }

    [HttpPost("consulta")]
    [ProducesResponseType(typeof(ConviteAcessoCasalDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ConviteAcessoCasalDto>> Consultar(ConsultarConviteCasalRequest request, CancellationToken cancelamento)
    {
        return Ok(await _acessoCasalService.ConsultarConviteAsync(request, cancelamento));
    }

    [HttpPost("aceite")]
    [ProducesResponseType(typeof(SessaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SessaoDto>> Aceitar(AceitarConviteCasalRequest request, CancellationToken cancelamento)
    {
        var resultado = await _acessoCasalService.AceitarConviteAsync(request, cancelamento);
        CookieRefreshToken.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
        return Ok(resultado.Sessao);
    }
}
