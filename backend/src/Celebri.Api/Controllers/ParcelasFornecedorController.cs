using Celebri.Api.Autenticacao;
using Celebri.Api.Autorizacao;
using Celebri.Api.Filtros;
using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Financeiro;
using Celebri.Dominio.Financeiro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Celebri.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:guid}/fornecedores/{vinculoId:guid}/parcelas")]
[Produces("application/json")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarFinanceiroEvento)]
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
    public async Task<ActionResult<CronogramaParcelasDto>> Listar(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.ListarAsync(eventoId, vinculoId, cancelamento));
    }

    [HttpPost]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> Criar(
        Guid eventoId,
        Guid vinculoId,
        SalvarParcelaRequest request,
        CancellationToken cancelamento)
    {
        var parcela = await _parcelaService.CriarAsync(eventoId, vinculoId, request, cancelamento);
        return Created($"/api/eventos/{eventoId}/fornecedores/{vinculoId}/parcelas/{parcela.Id}", parcela);
    }

    [HttpPost("geracao")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(typeof(CronogramaParcelasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CronogramaParcelasDto>> Gerar(
        Guid eventoId,
        Guid vinculoId,
        GerarParcelasRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.GerarAsync(eventoId, vinculoId, request, cancelamento));
    }

    [HttpPut("{parcelaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> Atualizar(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        SalvarParcelaRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.AtualizarAsync(eventoId, vinculoId, parcelaId, request, cancelamento));
    }

    [HttpDelete("{parcelaId:guid}")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Remover(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        await _parcelaService.RemoverAsync(eventoId, vinculoId, parcelaId, cancelamento);
        return NoContent();
    }

    [HttpPut("{parcelaId:guid}/pagamento")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> RegistrarPagamento(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        RegistrarPagamentoRequest request,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.RegistrarPagamentoAsync(eventoId, vinculoId, parcelaId, request, cancelamento));
    }

    [HttpDelete("{parcelaId:guid}/pagamento")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> DesfazerPagamento(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.DesfazerPagamentoAsync(eventoId, vinculoId, parcelaId, cancelamento));
    }

    [HttpPut("{parcelaId:guid}/comprovante")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
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
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        IFormFile arquivo,
        CancellationToken cancelamento)
    {
        await using var conteudo = arquivo.OpenReadStream();
        return Ok(await _parcelaService.AnexarComprovanteAsync(
            eventoId,
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
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        var comprovante = await _parcelaService.ObterComprovanteAsync(eventoId, vinculoId, parcelaId, cancelamento);
        Response.Headers.CacheControl = "no-store";
        return File(comprovante.Conteudo, comprovante.TipoConteudo, comprovante.NomeArquivo);
    }

    [HttpDelete("{parcelaId:guid}/comprovante")]
    [Authorize(Policy = PoliticasAutorizacao.GerenciarFinanceiroEvento)]
    [ProducesResponseType(typeof(ParcelaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ParcelaDto>> RemoverComprovante(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        return Ok(await _parcelaService.RemoverComprovanteAsync(eventoId, vinculoId, parcelaId, cancelamento));
    }
}
