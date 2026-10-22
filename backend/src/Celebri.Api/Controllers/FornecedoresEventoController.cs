using Celebri.Api.Autenticacao;
using Celebri.Api.Autorizacao;
using Celebri.Api.Filtros;
using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Dominio.Fornecedores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/fornecedores")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarFornecedoresEvento)]
public class FornecedoresEventoController : ControllerBase
{
    public const long TamanhoMaximoRequisicaoContrato = ArquivoPdf.TamanhoMaximoBytes + (64 * 1024);

    private readonly IFornecedorEventoService _vinculoService;

    public FornecedoresEventoController(IFornecedorEventoService vinculoService)
    {
        _vinculoService = vinculoService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ListaFornecedoresEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListaFornecedoresEventoDto>> Listar(Guid eventoId, CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.ListarAsync(eventoId, cancelamento));
    }

    [HttpGet("{vinculoId:guid}", Name = nameof(ObterFornecedorEvento))]
    [ProducesResponseType(typeof(FornecedorEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FornecedorEventoDto>> ObterFornecedorEvento(
        Guid eventoId,
        Guid vinculoId,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.ObterAsync(eventoId, vinculoId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresEvento)]
    [ProducesResponseType(typeof(FornecedorEventoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorEventoDto>> Vincular(
        Guid eventoId,
        VincularFornecedorRequest request,
        CancellationToken cancelamento)
    {
        var vinculo = await _vinculoService.VincularAsync(eventoId, request, cancelamento);
        return CreatedAtRoute(nameof(ObterFornecedorEvento), new { eventoId, vinculoId = vinculo.Id }, vinculo);
    }

    [HttpPut("{vinculoId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresEvento)]
    [ProducesResponseType(typeof(FornecedorEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorEventoDto>> Atualizar(
        Guid eventoId,
        Guid vinculoId,
        AtualizarFornecedorEventoRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.AtualizarAsync(eventoId, vinculoId, request, cancelamento));
    }

    [HttpDelete("{vinculoId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresEvento)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        await _vinculoService.RemoverAsync(eventoId, vinculoId, cancelamento);
        return NoContent();
    }

    [HttpPut("{vinculoId:guid}/contrato")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresEvento)]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Contrato)]
    [LimitarTamanhoRequisicao(TamanhoMaximoRequisicaoContrato, MensagensFornecedoresEvento.ContratoGrandeDemais)]
    [RequestSizeLimit(TamanhoMaximoRequisicaoContrato)]
    [RequestFormLimits(
        MultipartBodyLengthLimit = TamanhoMaximoRequisicaoContrato,
        MemoryBufferThreshold = 1024 * 1024,
        ValueCountLimit = 10)]
    [ProducesResponseType(typeof(FornecedorEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<FornecedorEventoDto>> AnexarContrato(
        Guid eventoId,
        Guid vinculoId,
        IFormFile arquivo,
        CancellationToken cancelamento)
    {
        await using var conteudo = arquivo.OpenReadStream();
        return Ok(await _vinculoService.AnexarContratoAsync(eventoId, vinculoId, arquivo.FileName, conteudo, cancelamento));
    }

    [HttpGet("{vinculoId:guid}/contrato")]
    [Produces(ArquivoPdf.TipoConteudo, "application/json")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, ArquivoPdf.TipoConteudo)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BaixarContrato(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var contrato = await _vinculoService.ObterContratoAsync(eventoId, vinculoId, cancelamento);
        Response.Headers.CacheControl = "no-store";
        return File(contrato.Conteudo, ArquivoPdf.TipoConteudo, contrato.NomeArquivo);
    }

    [HttpDelete("{vinculoId:guid}/contrato")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresEvento)]
    [ProducesResponseType(typeof(FornecedorEventoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<FornecedorEventoDto>> RemoverContrato(
        Guid eventoId,
        Guid vinculoId,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.RemoverContratoAsync(eventoId, vinculoId, cancelamento));
    }

    [HttpPost("importacao")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFornecedoresEvento)]
    [ProducesResponseType(typeof(ResultadoImportacaoFornecedoresDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ResultadoImportacaoFornecedoresDto>> Importar(
        Guid eventoId,
        ImportarFornecedoresRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _vinculoService.ImportarAsync(eventoId, request, cancelamento));
    }
}
