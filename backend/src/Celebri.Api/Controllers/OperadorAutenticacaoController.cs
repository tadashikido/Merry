using System.Security.Claims;
using Celebri.Api.Autenticacao;
using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Operadores;
using Celebri.Dominio.Excecoes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/operador/autenticacao")]
[Produces("application/json")]
public class OperadorAutenticacaoController : ControllerBase
{
    private readonly IOperadorAutenticacaoService _operadorAutenticacaoService;

    public OperadorAutenticacaoController(IOperadorAutenticacaoService operadorAutenticacaoService)
    {
        _operadorAutenticacaoService = operadorAutenticacaoService;
    }

    [AllowAnonymous]
    [HttpPost("entrar")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Entrar)]
    [ProducesResponseType(typeof(SessaoOperadorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SessaoOperadorDto>> Entrar(EntrarOperadorRequest request, CancellationToken cancelamento)
    {
        var resultado = await _operadorAutenticacaoService.EntrarAsync(request, cancelamento);
        CookieRefreshTokenOperador.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
        return Ok(resultado.Sessao);
    }

    [AllowAnonymous]
    [HttpPost("renovar")]
    [ExigirCabecalhoRequisicao]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Renovar)]
    [ProducesResponseType(typeof(SessaoOperadorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SessaoOperadorDto>> Renovar(CancellationToken cancelamento)
    {
        try
        {
            var resultado = await _operadorAutenticacaoService.RenovarAsync(CookieRefreshTokenOperador.Ler(Request), cancelamento);
            CookieRefreshTokenOperador.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
            return Ok(resultado.Sessao);
        }
        catch (CredenciaisInvalidasException excecao)
        {
            CookieRefreshTokenOperador.Remover(Response);
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: excecao.Message);
        }
    }

    [AllowAnonymous]
    [HttpPost("sair")]
    [ExigirCabecalhoRequisicao]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Sair(CancellationToken cancelamento)
    {
        await _operadorAutenticacaoService.SairAsync(CookieRefreshTokenOperador.Ler(Request), cancelamento);
        CookieRefreshTokenOperador.Remover(Response);
        return NoContent();
    }

    [Authorize(Policy = PoliticasAutorizacao.Operacao, AuthenticationSchemes = EsquemasAutenticacao.Operador)]
    [HttpGet("eu")]
    [ProducesResponseType(typeof(OperadorAutenticadoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<OperadorAutenticadoDto>> ObterOperadorAtual(CancellationToken cancelamento)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimsAutenticacao.UsuarioId), out var operadorId))
        {
            return Unauthorized();
        }

        return Ok(await _operadorAutenticacaoService.ObterOperadorAsync(operadorId, cancelamento));
    }
}
