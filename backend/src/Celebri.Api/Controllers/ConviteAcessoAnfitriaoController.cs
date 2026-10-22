using Celebri.Api.Autenticacao;
using Celebri.Aplicacao.AcessosAnfitriao;
using Celebri.Aplicacao.Autenticacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/acesso-anfitriao")]
[Produces("application/json")]
[AllowAnonymous]
[EnableRateLimiting(PoliticasLimiteRequisicao.AcessoAnfitriao)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class ConviteAcessoAnfitriaoController : ControllerBase
{
    private readonly IAcessoAnfitriaoService _acessoAnfitriaoService;

    public ConviteAcessoAnfitriaoController(IAcessoAnfitriaoService acessoAnfitriaoService)
    {
        _acessoAnfitriaoService = acessoAnfitriaoService;
    }

    [HttpPost("consulta")]
    [ProducesResponseType(typeof(ConviteAcessoAnfitriaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ConviteAcessoAnfitriaoDto>> Consultar(ConsultarConviteAnfitriaoRequest request, CancellationToken cancelamento)
    {
        return Ok(await _acessoAnfitriaoService.ConsultarConviteAsync(request, cancelamento));
    }

    [HttpPost("aceite")]
    [ProducesResponseType(typeof(SessaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SessaoDto>> Aceitar(AceitarConviteAnfitriaoRequest request, CancellationToken cancelamento)
    {
        var resultado = await _acessoAnfitriaoService.AceitarConviteAsync(request, cancelamento);
        CookieRefreshToken.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
        return Ok(resultado.Sessao);
    }
}
