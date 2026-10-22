using Casamento.Aplicacao.Excecoes;
using Casamento.Dominio.Excecoes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Testes.Integracao.Infraestrutura;

[AllowAnonymous]
[ApiController]
[Route("api/testes/erros")]
public class ErrosTestesController : ControllerBase
{
    public const string MensagemSensivel = "Password=segredo-interno";

    [HttpGet("inesperado")]
    public IActionResult Inesperado()
    {
        throw new InvalidOperationException(MensagemSensivel);
    }

    [HttpGet("regra-negocio")]
    public IActionResult RegraNegocio()
    {
        throw new RegraNegocioException("A confirmação de presença já foi encerrada.");
    }

    [HttpGet("requisicao-invalida")]
    public IActionResult RequisicaoInvalida()
    {
        throw new BadHttpRequestException("Request body too large.", StatusCodes.Status413PayloadTooLarge);
    }

    [HttpGet("nao-encontrado")]
    public IActionResult NaoEncontrado()
    {
        throw new RecursoNaoEncontradoException("Convidado não encontrado.");
    }
}
