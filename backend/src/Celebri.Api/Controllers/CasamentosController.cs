using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.Casamentos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarCasamentos)]
public class CasamentosController : ControllerBase
{
    private readonly ICasamentoService _casamentoService;
    private readonly IProximosPassosCasamentoService _proximosPassosService;

    public CasamentosController(ICasamentoService casamentoService, IProximosPassosCasamentoService proximosPassosService)
    {
        _casamentoService = casamentoService;
        _proximosPassosService = proximosPassosService;
    }

    [HttpGet]
    [Authorize(Policy = PoliticasAutorizacao.ListarCasamentos)]
    [ProducesResponseType(typeof(IReadOnlyList<CasamentoResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<CasamentoResumoDto>>> Listar(
        [FromQuery] SituacaoListagemCasamentos situacao = SituacaoListagemCasamentos.Ativos,
        CancellationToken cancelamento = default)
    {
        return Ok(await _casamentoService.ListarAsync(situacao, cancelamento));
    }

    [HttpGet("{id:guid}", Name = nameof(Obter))]
    [ProducesResponseType(typeof(CasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CasamentoDto>> Obter(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _casamentoService.ObterAsync(id, cancelamento));
    }

    [HttpGet("{id:guid}/proximos-passos")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCasamentos)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(typeof(ProximosPassosCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProximosPassosCasamentoDto>> ObterProximosPassos(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _proximosPassosService.ObterAsync(id, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCasamentos)]
    [ProducesResponseType(typeof(CasamentoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CasamentoDto>> Criar(SalvarCasamentoRequest request, CancellationToken cancelamento)
    {
        var casamento = await _casamentoService.CriarAsync(request, cancelamento);
        return CreatedAtRoute(nameof(Obter), new { id = casamento.Id }, casamento);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCasamentos)]
    [ProducesResponseType(typeof(CasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CasamentoDto>> Atualizar(Guid id, SalvarCasamentoRequest request, CancellationToken cancelamento)
    {
        return Ok(await _casamentoService.AtualizarAsync(id, request, cancelamento));
    }

    [HttpPost("{id:guid}/arquivar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCasamentos)]
    [ProducesResponseType(typeof(CasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CasamentoDto>> Arquivar(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _casamentoService.ArquivarAsync(id, cancelamento));
    }

    [HttpPost("{id:guid}/restaurar")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarCasamentos)]
    [ProducesResponseType(typeof(CasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CasamentoDto>> Restaurar(Guid id, CancellationToken cancelamento)
    {
        return Ok(await _casamentoService.RestaurarAsync(id, cancelamento));
    }
}
