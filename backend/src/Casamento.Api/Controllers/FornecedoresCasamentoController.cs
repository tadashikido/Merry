using Casamento.Api.Autenticacao;
using Casamento.Api.Autorizacao;
using Casamento.Api.Filtros;
using Casamento.Aplicacao.Arquivos;
using Casamento.Aplicacao.FornecedoresCasamento;
using Casamento.Dominio.Fornecedores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/fornecedores")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarFornecedoresCasamento)]
public class FornecedoresCasamentoController : ControllerBase
{
    public const long TamanhoMaximoRequisicaoContrato = ArquivoPdf.TamanhoMaximoBytes + (64 * 1024);

    private readonly IFornecedorCasamentoService _vinculoService;

    public FornecedoresCasamentoController(IFornecedorCasamentoService vinculoService)
    {
        _vinculoService = vinculoService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ListaFornecedoresCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListaFornecedoresCasamentoDto>> Listar(Guid casamentoId, CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.ListarAsync(casamentoId, cancelamento));
    }

    [HttpGet("{vinculoId:guid}", Name = nameof(ObterFornecedorCasamento))]
    [ProducesResponseType(typeof(FornecedorCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FornecedorCasamentoDto>> ObterFornecedorCasamento(
        Guid casamentoId,
        Guid vinculoId,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.ObterAsync(casamentoId, vinculoId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresCasamento)]
    [ProducesResponseType(typeof(FornecedorCasamentoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorCasamentoDto>> Vincular(
        Guid casamentoId,
        VincularFornecedorRequest request,
        CancellationToken cancelamento)
    {
        var vinculo = await _vinculoService.VincularAsync(casamentoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterFornecedorCasamento), new { casamentoId, vinculoId = vinculo.Id }, vinculo);
    }

    [HttpPut("{vinculoId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresCasamento)]
    [ProducesResponseType(typeof(FornecedorCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorCasamentoDto>> Atualizar(
        Guid casamentoId,
        Guid vinculoId,
        AtualizarFornecedorCasamentoRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.AtualizarAsync(casamentoId, vinculoId, request, cancelamento));
    }

    [HttpDelete("{vinculoId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresCasamento)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        await _vinculoService.RemoverAsync(casamentoId, vinculoId, cancelamento);
        return NoContent();
    }

    [HttpPut("{vinculoId:guid}/contrato")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresCasamento)]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Contrato)]
    [LimitarTamanhoRequisicao(TamanhoMaximoRequisicaoContrato, MensagensFornecedoresCasamento.ContratoGrandeDemais)]
    [RequestSizeLimit(TamanhoMaximoRequisicaoContrato)]
    [RequestFormLimits(
        MultipartBodyLengthLimit = TamanhoMaximoRequisicaoContrato,
        MemoryBufferThreshold = 1024 * 1024,
        ValueCountLimit = 10)]
    [ProducesResponseType(typeof(FornecedorCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<FornecedorCasamentoDto>> AnexarContrato(
        Guid casamentoId,
        Guid vinculoId,
        IFormFile arquivo,
        CancellationToken cancelamento)
    {
        await using var conteudo = arquivo.OpenReadStream();
        return Ok(await _vinculoService.AnexarContratoAsync(casamentoId, vinculoId, arquivo.FileName, conteudo, cancelamento));
    }

    [HttpGet("{vinculoId:guid}/contrato")]
    [Produces(ArquivoPdf.TipoConteudo, "application/json")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, ArquivoPdf.TipoConteudo)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BaixarContrato(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var contrato = await _vinculoService.ObterContratoAsync(casamentoId, vinculoId, cancelamento);
        Response.Headers.CacheControl = "no-store";
        return File(contrato.Conteudo, ArquivoPdf.TipoConteudo, contrato.NomeArquivo);
    }

    [HttpDelete("{vinculoId:guid}/contrato")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresCasamento)]
    [ProducesResponseType(typeof(FornecedorCasamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorCasamentoDto>> RemoverContrato(
        Guid casamentoId,
        Guid vinculoId,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.RemoverContratoAsync(casamentoId, vinculoId, cancelamento));
    }

    [HttpPost("importacao")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresCasamento)]
    [ProducesResponseType(typeof(ResultadoImportacaoFornecedoresDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ResultadoImportacaoFornecedoresDto>> Importar(
        Guid casamentoId,
        ImportarFornecedoresRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.ImportarAsync(casamentoId, request, cancelamento));
    }
}
