using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Excecoes;
using Casamento.Dominio.Excecoes;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Tratamento;

public class ExcecaoGlobalHandler : IExceptionHandler
{
    public const string TituloErroInterno = "Ocorreu um erro inesperado.";
    public const string TituloRegraNegocio = "A operação viola uma regra de negócio.";
    public const string TituloNaoEncontrado = "Recurso não encontrado.";
    public const string TituloRequisicaoInvalida = "A requisição é inválida.";
    public const string TituloConflito = "A operação conflita com o estado atual.";
    public const string ExtensaoCampo = "campo";
    public const string TituloArquivoGrandeDemais = "A requisição passa do tamanho permitido.";
    public const string TituloConcorrencia = "O registro foi alterado por outra operação. Tente novamente.";

    private readonly IProblemDetailsService _problemDetailsService;
    private readonly IHostEnvironment _ambiente;
    private readonly ILogger<ExcecaoGlobalHandler> _logger;

    public ExcecaoGlobalHandler(
        IProblemDetailsService problemDetailsService,
        IHostEnvironment ambiente,
        ILogger<ExcecaoGlobalHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _ambiente = ambiente;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var detalhesProblema = CriarDetalhesProblema(exception);

        if (detalhesProblema.Status >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Erro não tratado ao processar {Metodo} {Caminho}", httpContext.Request.Method, httpContext.Request.Path);
        }

        if (exception is ViolacaoIsolamentoException violacao)
        {
            _logger.LogWarning(
                "Gravação fora da organização corrente bloqueada em {Metodo} {Caminho}: entidade {Entidade}, usuário {UsuarioId}, organização {OrganizacaoId}",
                httpContext.Request.Method,
                httpContext.Request.Path,
                violacao.Entidade,
                httpContext.User.FindFirst(ClaimsAutenticacao.UsuarioId)?.Value,
                httpContext.User.FindFirst(ClaimsAutenticacao.OrganizacaoId)?.Value);
        }

        httpContext.Response.StatusCode = detalhesProblema.Status ?? StatusCodes.Status500InternalServerError;

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = detalhesProblema,
        });
    }

    public ProblemDetails CriarDetalhesProblema(Exception excecao)
    {
        return excecao switch
        {
            RegraNegocioException regraNegocio => CriarDetalhesRegraNegocio(regraNegocio),
            ConflitoException conflito => new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = conflito.Message,
            },
            ConcorrenciaException => new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = TituloConcorrencia,
            },
            CredenciaisInvalidasException credenciais => new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = credenciais.Message,
            },
            BadHttpRequestException requisicaoInvalida => new ProblemDetails
            {
                Status = requisicaoInvalida.StatusCode,
                Title = TituloRequisicaoInvalida,
            },
            ArquivoGrandeDemaisException grandeDemais => new ProblemDetails
            {
                Status = StatusCodes.Status413PayloadTooLarge,
                Title = TituloArquivoGrandeDemais,
                Detail = grandeDemais.Message,
            },
            ViolacaoIsolamentoException => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = TituloNaoEncontrado,
            },
            RecursoNaoEncontradoException naoEncontrado => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = TituloNaoEncontrado,
                Detail = naoEncontrado.Message,
            },
            _ => new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = TituloErroInterno,
                Detail = _ambiente.IsDevelopment() ? excecao.ToString() : null,
            },
        };
    }

    private static ProblemDetails CriarDetalhesRegraNegocio(RegraNegocioException regraNegocio)
    {
        var detalhes = new ProblemDetails
        {
            Status = StatusCodes.Status422UnprocessableEntity,
            Title = TituloRegraNegocio,
            Detail = regraNegocio.Message,
        };

        if (regraNegocio.Campo is not null)
        {
            detalhes.Extensions[ExtensaoCampo] = regraNegocio.Campo;
        }

        return detalhes;
    }
}
