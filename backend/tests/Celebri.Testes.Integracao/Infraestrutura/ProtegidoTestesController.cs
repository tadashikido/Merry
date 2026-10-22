using Casamento.Aplicacao.UsuarioAtual;
using Microsoft.AspNetCore.Mvc;

namespace Casamento.Testes.Integracao.Infraestrutura;

[ApiController]
[Route("api/testes/protegido")]
public class ProtegidoTestesController : ControllerBase
{
    private readonly IUsuarioAtual _usuarioAtual;

    public ProtegidoTestesController(IUsuarioAtual usuarioAtual)
    {
        _usuarioAtual = usuarioAtual;
    }

    [HttpGet]
    public IActionResult Obter()
    {
        return Ok(new { organizacaoId = _usuarioAtual.OrganizacaoId, papel = _usuarioAtual.Papel });
    }
}
