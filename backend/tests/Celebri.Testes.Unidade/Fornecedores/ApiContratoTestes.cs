using System.Net;
using System.Security.Claims;
using Celebri.Api.Autenticacao;
using Celebri.Api.Tratamento;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Dominio.Fornecedores;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;

namespace Celebri.Testes.Unidade.Fornecedores;

public class ApiContratoTestes
{
    [Fact]
    public void ChaveParticao_DoContrato_DeveSerPorUsuarioComFallbackPorIp()
    {
        var comUsuario = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimsAutenticacao.UsuarioId, "u-1")], "Bearer")),
        };
        comUsuario.Connection.RemoteIpAddress = IPAddress.Parse("10.0.0.1");
        var anonimo = new DefaultHttpContext();
        anonimo.Connection.RemoteIpAddress = IPAddress.Parse("10.0.0.2");

        Assert.Equal("usuario:u-1", ConfiguracaoAutenticacaoApi.ChaveParticao(comUsuario, porUsuario: true));
        Assert.Equal("ip:10.0.0.1", ConfiguracaoAutenticacaoApi.ChaveParticao(comUsuario, porUsuario: false));
        Assert.Equal("ip:10.0.0.2", ConfiguracaoAutenticacaoApi.ChaveParticao(anonimo, porUsuario: true));
        Assert.Contains(PoliticasLimiteRequisicao.Contrato, PoliticasLimiteRequisicao.PorUsuario);
        Assert.Equal((20, 60), PoliticasLimiteRequisicao.Padroes[PoliticasLimiteRequisicao.Contrato]);
    }

    [Fact]
    public void ArquivoGrandeDemais_DeveVirar413ComMensagemPtBr()
    {
        var handler = new ExcecaoGlobalHandler(
            new ServicoProblemDetailsNulo(),
            new HostingEnvironment { EnvironmentName = Environments.Production },
            NullLogger<ExcecaoGlobalHandler>.Instance);

        var detalhes = handler.CriarDetalhesProblema(new ArquivoGrandeDemaisException(MensagensFornecedoresCasamento.ContratoGrandeDemais));

        Assert.Equal(StatusCodes.Status413PayloadTooLarge, detalhes.Status);
        Assert.Equal(MensagensFornecedoresCasamento.ContratoGrandeDemais, detalhes.Detail);
    }

    private sealed class ServicoProblemDetailsNulo : IProblemDetailsService
    {
        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            return ValueTask.CompletedTask;
        }
    }
}
