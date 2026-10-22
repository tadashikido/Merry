using Celebri.Api.Tratamento;
using Celebri.Aplicacao.Excecoes;
using Celebri.Dominio.Excecoes;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;

namespace Celebri.Testes.Unidade.Api;

public class ExcecaoGlobalHandlerTestes
{
    [Fact]
    public void CriarDetalhesProblema_RegraNegocio_DeveRetornar422ComMensagemDaRegra()
    {
        var handler = CriarHandler(Environments.Production);

        var detalhes = handler.CriarDetalhesProblema(new RegraNegocioException("O casamento já foi encerrado."));

        Assert.Equal(StatusCodes.Status422UnprocessableEntity, detalhes.Status);
        Assert.Equal(ExcecaoGlobalHandler.TituloRegraNegocio, detalhes.Title);
        Assert.Equal("O casamento já foi encerrado.", detalhes.Detail);
    }

    [Fact]
    public void CriarDetalhesProblema_RecursoNaoEncontrado_DeveRetornar404ComMensagem()
    {
        var handler = CriarHandler(Environments.Production);

        var detalhes = handler.CriarDetalhesProblema(new RecursoNaoEncontradoException("Convidado não encontrado."));

        Assert.Equal(StatusCodes.Status404NotFound, detalhes.Status);
        Assert.Equal(ExcecaoGlobalHandler.TituloNaoEncontrado, detalhes.Title);
        Assert.Equal("Convidado não encontrado.", detalhes.Detail);
    }

    [Theory]
    [InlineData(StatusCodes.Status400BadRequest)]
    [InlineData(StatusCodes.Status408RequestTimeout)]
    [InlineData(StatusCodes.Status413PayloadTooLarge)]
    public void CriarDetalhesProblema_RequisicaoInvalida_DevePreservarStatusDoClienteSemDetalhes(int status)
    {
        var handler = CriarHandler(Environments.Production);

        var detalhes = handler.CriarDetalhesProblema(new BadHttpRequestException("Request body too large.", status));

        Assert.Equal(status, detalhes.Status);
        Assert.Equal(ExcecaoGlobalHandler.TituloRequisicaoInvalida, detalhes.Title);
        Assert.Null(detalhes.Detail);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    [InlineData("Testes")]
    public void CriarDetalhesProblema_ErroInesperadoForaDeDevelopment_NaoDeveExporDetalhes(string ambiente)
    {
        var handler = CriarHandler(ambiente);

        var detalhes = handler.CriarDetalhesProblema(new InvalidOperationException("senha=segredo; stack interna"));

        Assert.Equal(StatusCodes.Status500InternalServerError, detalhes.Status);
        Assert.Equal(ExcecaoGlobalHandler.TituloErroInterno, detalhes.Title);
        Assert.Null(detalhes.Detail);
    }

    [Fact]
    public void CriarDetalhesProblema_ErroInesperadoEmDevelopment_DeveIncluirDetalhesParaDiagnostico()
    {
        var handler = CriarHandler(Environments.Development);

        var detalhes = handler.CriarDetalhesProblema(new InvalidOperationException("falha de diagnóstico"));

        Assert.Equal(StatusCodes.Status500InternalServerError, detalhes.Status);
        Assert.Contains("falha de diagnóstico", detalhes.Detail);
    }

    [Fact]
    public async Task TryHandleAsync_DeveDefinirStatusDaRespostaEEscreverProblemDetails()
    {
        var problemDetailsService = new ProblemDetailsServiceFalso();
        var handler = CriarHandler(Environments.Production, problemDetailsService);
        var contexto = new DefaultHttpContext();

        var tratado = await handler.TryHandleAsync(contexto, new RegraNegocioException("Regra violada."), CancellationToken.None);

        Assert.True(tratado);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, contexto.Response.StatusCode);
        Assert.NotNull(problemDetailsService.UltimoContexto);
        Assert.Equal("Regra violada.", problemDetailsService.UltimoContexto!.ProblemDetails.Detail);
    }

    [Fact]
    public async Task TryHandleAsync_ErroInesperado_DeveDefinirStatus500()
    {
        var problemDetailsService = new ProblemDetailsServiceFalso();
        var handler = CriarHandler(Environments.Production, problemDetailsService);
        var contexto = new DefaultHttpContext();

        await handler.TryHandleAsync(contexto, new Exception("erro"), CancellationToken.None);

        Assert.Equal(StatusCodes.Status500InternalServerError, contexto.Response.StatusCode);
        Assert.Null(problemDetailsService.UltimoContexto!.ProblemDetails.Detail);
    }

    private static ExcecaoGlobalHandler CriarHandler(string ambiente, IProblemDetailsService? problemDetailsService = null)
    {
        var ambienteHospedagem = new HostingEnvironment { EnvironmentName = ambiente };
        return new ExcecaoGlobalHandler(
            problemDetailsService ?? new ProblemDetailsServiceFalso(),
            ambienteHospedagem,
            NullLogger<ExcecaoGlobalHandler>.Instance);
    }

    private sealed class ProblemDetailsServiceFalso : IProblemDetailsService
    {
        public ProblemDetailsContext? UltimoContexto { get; private set; }

        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            UltimoContexto = context;
            return ValueTask.CompletedTask;
        }

        public ValueTask<bool> TryWriteAsync(ProblemDetailsContext context)
        {
            UltimoContexto = context;
            return ValueTask.FromResult(true);
        }
    }
}
