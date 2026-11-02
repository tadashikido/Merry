using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Operadores;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class OperadorPlataformaRepository : IOperadorPlataformaRepository
{
    private readonly CelebriDbContext _contexto;

    public OperadorPlataformaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<OperadorPlataforma?> ObterPorEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return _contexto.OperadoresPlataforma.FirstOrDefaultAsync(operador => operador.Email == emailNormalizado, cancelamento);
    }

    public Task<OperadorPlataforma?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return _contexto.OperadoresPlataforma.FirstOrDefaultAsync(operador => operador.Id == id, cancelamento);
    }

    public Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return _contexto.OperadoresPlataforma.AnyAsync(operador => operador.Email == emailNormalizado, cancelamento);
    }

    public void Adicionar(OperadorPlataforma operador)
    {
        _contexto.OperadoresPlataforma.Add(operador);
    }
}
