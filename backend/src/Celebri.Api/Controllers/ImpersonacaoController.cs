using System.Security.Claims;
using Celebri.Api.Autenticacao;
using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Impersonacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/operador/impersonacoes")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.Operacao, AuthenticationSchemes = EsquemasAutenticacao.Operador)]
public class ImpersonacaoController : ControllerBase
{
    private readonly IImpersonacaoService _impersonacaoService;

    public ImpersonacaoController(IImpersonacaoService impersonacaoService)
    {
        _impersonacaoService = impersonacaoService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(SessaoImpersonacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<SessaoImpersonacaoDto>> Iniciar(IniciarImpersonacaoRequest request, CancellationToken cancelamento)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimsAutenticacao.UsuarioId), out var operadorId))
        {
            return Unauthorized();
        }

        return Ok(await _impersonacaoService.IniciarAsync(operadorId, request, cancelamento));
    }

    [HttpPost("{sessaoId:guid}/encerrar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Encerrar(Guid sessaoId, CancellationToken cancelamento)
    {
        await _impersonacaoService.EncerrarAsync(sessaoId, cancelamento);
        return NoContent();
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SessaoImpersonacaoResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<SessaoImpersonacaoResumoDto>>> Listar([FromQuery] int limite = 50, CancellationToken cancelamento = default)
    {
        return Ok(await _impersonacaoService.ListarAsync(limite, cancelamento));
    }
}
