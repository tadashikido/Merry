using Casamento.Api.Autorizacao;
using Casamento.Aplicacao.Fornecedores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/fornecedores")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedores)]
public class FornecedoresController : ControllerBase
{
    private readonly IFornecedorService _fornecedorService;

    public FornecedoresController(IFornecedorService fornecedorService)
    {
        _fornecedorService = fornecedorService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<FornecedorResumoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<FornecedorResumoDto>>> Listar(CancellationToken cancelamento)
    {
        return Ok(await _fornecedorService.ListarAsync(cancelamento));
    }

    [HttpGet("{fornecedorId:guid}", Name = nameof(ObterFornecedor))]
    [ProducesResponseType(typeof(FornecedorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FornecedorDto>> ObterFornecedor(Guid fornecedorId, CancellationToken cancelamento)
    {
        return Ok(await _fornecedorService.ObterAsync(fornecedorId, cancelamento));
    }

    [HttpGet("{fornecedorId:guid}/casamentos")]
    [ProducesResponseType(typeof(IReadOnlyList<ParticipacaoFornecedorDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ParticipacaoFornecedorDto>>> ListarParticipacoes(
        Guid fornecedorId,
        CancellationToken cancelamento)
    {
        return Ok(await _fornecedorService.ListarParticipacoesAsync(fornecedorId, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(FornecedorDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorDto>> Criar(SalvarFornecedorRequest request, CancellationToken cancelamento)
    {
        var fornecedor = await _fornecedorService.CriarAsync(request, cancelamento);
        return CreatedAtRoute(nameof(ObterFornecedor), new { fornecedorId = fornecedor.Id }, fornecedor);
    }

    [HttpPut("{fornecedorId:guid}")]
    [ProducesResponseType(typeof(FornecedorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorDto>> Atualizar(
        Guid fornecedorId,
        SalvarFornecedorRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _fornecedorService.AtualizarAsync(fornecedorId, request, cancelamento));
    }

    [HttpPost("{fornecedorId:guid}/arquivar")]
    [ProducesResponseType(typeof(FornecedorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FornecedorDto>> Arquivar(Guid fornecedorId, CancellationToken cancelamento)
    {
        return Ok(await _fornecedorService.ArquivarAsync(fornecedorId, cancelamento));
    }

    [HttpPost("{fornecedorId:guid}/restaurar")]
    [ProducesResponseType(typeof(FornecedorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FornecedorDto>> Restaurar(Guid fornecedorId, CancellationToken cancelamento)
    {
        return Ok(await _fornecedorService.RestaurarAsync(fornecedorId, cancelamento));
    }

    [HttpDelete("{fornecedorId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid fornecedorId, CancellationToken cancelamento)
    {
        await _fornecedorService.RemoverAsync(fornecedorId, cancelamento);
        return NoContent();
    }
}
