using Casamento.Aplicacao.Sistema;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/sistema")]
[Produces("application/json")]
public class SistemaController : ControllerBase
{
    private readonly IInformacoesSistemaService _informacoesSistemaService;

    public SistemaController(IInformacoesSistemaService informacoesSistemaService)
    {
        _informacoesSistemaService = informacoesSistemaService;
    }

    [HttpGet("informacoes")]
    [ProducesResponseType(typeof(InformacoesSistemaDto), StatusCodes.Status200OK)]
    public ActionResult<InformacoesSistemaDto> ObterInformacoes()
    {
        return Ok(_informacoesSistemaService.Obter());
    }
}
