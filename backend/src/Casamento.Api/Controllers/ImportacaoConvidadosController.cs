using Casamento.Api.Autenticacao;
using Casamento.Api.Autorizacao;
using Casamento.Api.Filtros;
using Casamento.Aplicacao.Convidados.Importacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Casamento.Api.Controllers;

[ApiController]
[Route("api/casamentos/{casamentoId:guid}/convites/importacao")]
[Produces("application/json")]
[Consumes("multipart/form-data")]
[Authorize(Policy = PoliticasAutorizacao.ConsultarConvidados)]
[Authorize(Policy = PoliticasAutorizacao.GerenciarConvidados)]
[EnableRateLimiting(PoliticasLimiteRequisicao.Importacao)]
[LimitarTamanhoRequisicao(LimitesImportacao.TamanhoMaximoRequisicao, MensagensImportacaoConvidados.ArquivoGrandeDemais)]
[RequestSizeLimit(LimitesImportacao.TamanhoMaximoRequisicao)]
[RequestFormLimits(
    MultipartBodyLengthLimit = LimitesImportacao.TamanhoMaximoRequisicao,
    MemoryBufferThreshold = LimitesImportacao.TamanhoMaximoRequisicao,
    ValueCountLimit = 10)]
public class ImportacaoConvidadosController : ControllerBase
{
    private readonly IImportacaoConvidadosService _importacaoService;

    public ImportacaoConvidadosController(IImportacaoConvidadosService importacaoService)
    {
        _importacaoService = importacaoService;
    }

    [HttpPost("pre-visualizacao")]
    [ProducesResponseType(typeof(PreVisualizacaoImportacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<PreVisualizacaoImportacaoDto>> PreVisualizar(
        Guid casamentoId,
        IFormFile arquivo,
        CancellationToken cancelamento)
    {
        await using var conteudo = arquivo.OpenReadStream();
        return Ok(await _importacaoService.PreVisualizarAsync(casamentoId, conteudo, cancelamento));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ResultadoImportacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ResultadoImportacaoDto>> Importar(
        Guid casamentoId,
        IFormFile arquivo,
        [FromForm] ConfirmarImportacaoRequest confirmacao,
        CancellationToken cancelamento)
    {
        await using var conteudo = arquivo.OpenReadStream();
        return Ok(await _importacaoService.ImportarAsync(casamentoId, conteudo, confirmacao, cancelamento));
    }
}
