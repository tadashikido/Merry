using Casamento.Api.Autenticacao;
using Casamento.Api.Autorizacao;
using Casamento.Api.Filtros;
using Casamento.Aplicacao.Arquivos;
using Casamento.Aplicacao.Financeiro;
using Casamento.Dominio.Financeiro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/fornecedores/{vinculoId:guid}/parcelas")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarFinanceiroCasamento)]
public class ParcelasFornecedorController : ControllerBase
{
    public const long TamanhoMaximoRequisicaoComprovante = ArquivoPdf.TamanhoMaximoBytes + (64 * 1024);

    private readonly IParcelaFornecedorService _parcelaService;

    public ParcelasFornecedorController(IParcelaFornecedorService parcelaService)
    {
        _parcelaService = parcelaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CronogramaParcelasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CronogramaParcelasDto>> Listar(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ListarAsync(casamentoId, vinculoId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> Criar(
        Guid casamentoId,
        Guid vinculoId,
        SalvarParcelaRequest request,
        CancellationToken cancelamento)
    {
        var parcela = await _parcelaService.CriarAsync(casamentoId, vinculoId, request, cancelamento);
        return Created($"/api/casamentos/{casamentoId}/fornecedores/{vinculoId}/parcelas/{parcela.Id}", parcela);
    }

    [HttpPost("geracao")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(typeof(CronogramaParcelasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CronogramaParcelasDto>> Gerar(
        Guid casamentoId,
        Guid vinculoId,
        GerarParcelasRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.GerarAsync(casamentoId, vinculoId, request, cancelamento));
    }

    [HttpPut("{parcelaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> Atualizar(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        SalvarParcelaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.AtualizarAsync(casamentoId, vinculoId, parcelaId, request, cancelamento));
    }

    [HttpDelete("{parcelaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid casamentoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        await _parcelaService.RemoverAsync(casamentoId, vinculoId, parcelaId, cancelamento);
        return NoContent();
    }

    [HttpPut("{parcelaId:guid}/pagamento")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> RegistrarPagamento(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        RegistrarPagamentoRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.RegistrarPagamentoAsync(casamentoId, vinculoId, parcelaId, request, cancelamento));
    }

    [HttpDelete("{parcelaId:guid}/pagamento")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> DesfazerPagamento(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.DesfazerPagamentoAsync(casamentoId, vinculoId, parcelaId, cancelamento));
    }

    [HttpPut("{parcelaId:guid}/comprovante")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting(PoliticasLimiteRequisicao.Comprovante)]
    [LimitarTamanhoRequisicao(TamanhoMaximoRequisicaoComprovante, MensagensFinanceiro.ComprovanteGrandeDemais)]
    [RequestSizeLimit(TamanhoMaximoRequisicaoComprovante)]
    [RequestFormLimits(
        MultipartBodyLengthLimit = TamanhoMaximoRequisicaoComprovante,
        MemoryBufferThreshold = 1024 * 1024,
        ValueCountLimit = 10)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ParcelaDto>> AnexarComprovante(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        IFormFile arquivo,
        CancellationToken cancelamento)
    {
        await using var conteudo = arquivo.OpenReadStream();
        return Ok(await _parcelaService.AnexarComprovanteAsync(
            casamentoId,
            vinculoId,
            parcelaId,
            arquivo.FileName,
            conteudo,
            cancelamento));
    }

    [HttpGet("{parcelaId:guid}/comprovante")]
    [Produces(ArquivoComprovante.TipoPdf, ArquivoComprovante.TipoJpeg, ArquivoComprovante.TipoPng, "application/json")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BaixarComprovante(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        var comprovante = await _parcelaService.ObterComprovanteAsync(casamentoId, vinculoId, parcelaId, cancelamento);
        Response.Headers.CacheControl = "no-store";
        return File(comprovante.Conteudo, comprovante.TipoConteudo, comprovante.NomeArquivo);
    }

    [HttpDelete("{parcelaId:guid}/comprovante")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroCasamento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> RemoverComprovante(
        Guid casamentoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.RemoverComprovanteAsync(casamentoId, vinculoId, parcelaId, cancelamento));
    }
}
