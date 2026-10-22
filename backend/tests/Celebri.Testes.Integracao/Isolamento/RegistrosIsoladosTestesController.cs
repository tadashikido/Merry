using Casamento.Aplicacao.Excecoes;
using Casamento.Infraestrutura.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Testes.Integracao.Isolamento;

public record RegistroIsoladoRequest(string Descricao);

public record RegistroIsoladoResponse(Guid Id, string Descricao);

[ApiController]
[Route(Rota)]
public class RegistrosIsoladosTestesController : ControllerBase
{
    public const string Rota = "api/testes/registros-isolados";
    public const string MensagemNaoEncontrado = "Registro não encontrado.";

    private readonly CasamentoDbContext _contexto;

    public RegistrosIsoladosTestesController(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    [HttpGet]
    public async Task<IReadOnlyList<RegistroIsoladoResponse>> Listar(CancellationToken cancelamento)
    {
        return await _contexto.Set<RegistroIsolado>()
            .OrderBy(registro => registro.Descricao)
            .Select(registro => new RegistroIsoladoResponse(registro.Id, registro.Descricao))
            .ToListAsync(cancelamento);
    }

    [HttpGet("{id:guid}")]
    public async Task<RegistroIsoladoResponse> Obter(Guid id, CancellationToken cancelamento)
    {
        var registro = await ObterRegistroAsync(id, cancelamento);
        return new RegistroIsoladoResponse(registro.Id, registro.Descricao);
    }

    [HttpPost]
    public async Task<ActionResult<RegistroIsoladoResponse>> Criar(RegistroIsoladoRequest request, CancellationToken cancelamento)
    {
        var registro = RegistroIsolado.Criar(request.Descricao);
        _contexto.Add(registro);
        await _contexto.SaveChangesAsync(cancelamento);
        return CreatedAtAction(nameof(Obter), new { id = registro.Id }, new RegistroIsoladoResponse(registro.Id, registro.Descricao));
    }

    [HttpPut("{id:guid}")]
    public async Task<RegistroIsoladoResponse> Alterar(Guid id, RegistroIsoladoRequest request, CancellationToken cancelamento)
    {
        var registro = await ObterRegistroAsync(id, cancelamento);
        registro.AlterarDescricao(request.Descricao);
        await _contexto.SaveChangesAsync(cancelamento);
        return new RegistroIsoladoResponse(registro.Id, registro.Descricao);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken cancelamento)
    {
        var registro = await ObterRegistroAsync(id, cancelamento);
        _contexto.Remove(registro);
        await _contexto.SaveChangesAsync(cancelamento);
        return NoContent();
    }

    [HttpPut("{id:guid}/sem-consulta")]
    public async Task<IActionResult> AlterarSemConsulta(Guid id, [FromQuery] Guid organizacaoId, RegistroIsoladoRequest request, CancellationToken cancelamento)
    {
        _contexto.Update(RegistroIsolado.Reconstituir(id, organizacaoId, request.Descricao));
        await _contexto.SaveChangesAsync(cancelamento);
        return NoContent();
    }

    private async Task<RegistroIsolado> ObterRegistroAsync(Guid id, CancellationToken cancelamento)
    {
        return await _contexto.Set<RegistroIsolado>().FirstOrDefaultAsync(registro => registro.Id == id, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagemNaoEncontrado);
    }
}
