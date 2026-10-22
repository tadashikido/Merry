using Celebri.Api.Autenticacao;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Excecoes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/autenticacao")]
[Produces("application/json")]
public class AutenticacaoController : ControllerBase
{
    private readonly IAutenticacaoService _autenticacaoService;
    private readonly IRecuperacaoSenhaService _recuperacaoSenhaService;
    private readonly IUsuarioAtual _usuarioAtual;

    public AutenticacaoController(
        IAutenticacaoService autenticacaoService,
        IRecuperacaoSenhaService recuperacaoSenhaService,
        IUsuarioAtual usuarioAtual)
    {
        _autenticacaoService = autenticacaoService;
        _recuperacaoSenhaService = recuperacaoSenhaService;
        _usuarioAtual = usuarioAtual;
    }

    [AllowAnonymous]
    [HttpPost("cadastro")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Cadastro)]
    [ProducesResponseType(typeof(SessaoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SessaoDto>> Cadastrar(CadastroOrganizacaoRequest request, CancellationToken cancelamento)
    {
        var resultado = await _autenticacaoService.CadastrarAsync(request, cancelamento);
        CookieRefreshToken.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
        return StatusCode(StatusCodes.Status201Created, resultado.Sessao);
    }

    [AllowAnonymous]
    [HttpPost("entrar")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Entrar)]
    [ProducesResponseType(typeof(SessaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SessaoDto>> Entrar(EntrarRequest request, CancellationToken cancelamento)
    {
        var resultado = await _autenticacaoService.EntrarAsync(request, cancelamento);
        CookieRefreshToken.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
        return Ok(resultado.Sessao);
    }

    [AllowAnonymous]
    [HttpPost("renovar")]
    [ExigirCabecalhoRequisicao]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Renovar)]
    [ProducesResponseType(typeof(SessaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SessaoDto>> Renovar(CancellationToken cancelamento)
    {
        try
        {
            var resultado = await _autenticacaoService.RenovarAsync(CookieRefreshToken.Ler(Request), cancelamento);
            CookieRefreshToken.Gravar(Response, resultado.RefreshToken, resultado.RefreshTokenExpiraEm);
            return Ok(resultado.Sessao);
        }
        catch (CredenciaisInvalidasException excecao)
        {
            CookieRefreshToken.Remover(Response);
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: excecao.Message);
        }
    }

    [AllowAnonymous]
    [HttpPost("sair")]
    [ExigirCabecalhoRequisicao]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Sair(CancellationToken cancelamento)
    {
        await _autenticacaoService.SairAsync(CookieRefreshToken.Ler(Request), cancelamento);
        CookieRefreshToken.Remover(Response);
        return NoContent();
    }

    [Authorize]
    [HttpGet("eu")]
    [ProducesResponseType(typeof(UsuarioAutenticadoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UsuarioAutenticadoDto>> ObterUsuarioAtual(CancellationToken cancelamento)
    {
        if (_usuarioAtual.UsuarioId is not { } usuarioId)
        {
            return Unauthorized();
        }

        return Ok(await _autenticacaoService.ObterUsuarioAsync(usuarioId, cancelamento));
    }

    [AllowAnonymous]
    [HttpPost("esqueci-senha")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Recuperacao)]
    [ProducesResponseType(typeof(SolicitacaoRecuperacaoDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SolicitacaoRecuperacaoDto>> SolicitarRecuperacao(EsqueciSenhaRequest request, CancellationToken cancelamento)
    {
        return Accepted(await _recuperacaoSenhaService.SolicitarAsync(request, cancelamento));
    }

    [AllowAnonymous]
    [HttpPost("redefinir-senha")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Recuperacao)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RedefinirSenha(RedefinirSenhaRequest request, CancellationToken cancelamento)
    {
        await _recuperacaoSenhaService.RedefinirAsync(request, cancelamento);
        return NoContent();
    }
}
